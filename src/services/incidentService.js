// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

// Erreur métier avec code HTTP — permet aux contrôleurs de renvoyer 400/403 au lieu de 500
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Génère un numéro de référence unique à l'intérieur d'une transaction
// (tx = client Prisma normal ou transactionnel)
const genererReference = async (tx) => {
  const annee = new Date().getFullYear();
  const dernier = await tx.incident.findFirst({
    where: { numeroReference: { startsWith: `INC-${annee}-` } },
    orderBy: { numeroReference: "desc" },
  });
  const dernierNumero = dernier
    ? parseInt(dernier.numeroReference.split("-")[2], 10)
    : 0;
  return `INC-${annee}-${String(dernierNumero + 1).padStart(4, "0")}`;
};

// Récupère les incidents avec filtrage par rôle, filtres optionnels et pagination
const getAllIncidents = async (userId, role, entrepriseId, { statut, type, gravite, page = 1, limit = 20 } = {}) => {
  const scopeWhere =
    role === "EMPLOYE"
      ? { declareParId: userId }
      : { declarePar: { entrepriseId } };

  const where = {
    ...scopeWhere,
    ...(statut  && { statut }),
    ...(type    && { type }),
    ...(gravite && { gravite }),
  };

  const skip = (page - 1) * limit;

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: {
        declarePar: { select: { id: true, nom: true, prenom: true, email: true } },
        site: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.incident.count({ where }),
  ]);

  return { data: incidents, total, page, totalPages: Math.ceil(total / limit) || 1 };
};

// Récupère un incident par son id
const getIncidentById = async (id) => {
  return await prisma.incident.findUnique({
    where: { id },
    include: {
      declarePar: { select: { id: true, nom: true, prenom: true, email: true } },
      validePar: { select: { id: true, nom: true, prenom: true, email: true } },
      site: true,
    },
  });
};

// Crée un nouvel incident dans une transaction atomique avec retry anti-collision.
// La génération de la référence et l'insertion sont dans le même $transaction :
// si deux requêtes simultanées génèrent la même référence, la contrainte @unique
// déclenche une erreur P2002 sur la seconde — on réessaie jusqu'à 3 fois.
const createIncident = async (data, userId) => {
  if (new Date(data.dateIncident) > new Date()) {
    throw new ErreurMetier("La date de l'incident ne peut pas être dans le futur.");
  }

  for (let tentative = 0; tentative < 3; tentative++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const numeroReference = await genererReference(tx);
        return await tx.incident.create({
          data: {
            numeroReference,
            type:           data.type,
            description:    data.description,
            gravite:        data.gravite,
            latitude:       data.latitude,
            longitude:      data.longitude,
            adresseLisible: data.adresseLisible,
            photoUrl:       data.photoUrl,
            dateIncident:   new Date(data.dateIncident),
            declareParId:   userId,
            siteId:         data.siteId,
          },
        });
      });
    } catch (err) {
      // P2002 = violation contrainte unique sur numeroReference (collision simultanée)
      if (err.code === "P2002" && tentative < 2) continue;
      throw err;
    }
  }
};

// Met à jour un incident
const updateIncident = async (id, data) => {
  return await prisma.incident.update({
    where: { id },
    data,
  });
};

// Supprime un incident
const deleteIncident = async (id) => {
  return await prisma.incident.delete({
    where: { id },
  });
};

// ── Workflow de statuts ────────────────────────────────────────────────────────

// BROUILLON → OUVERT : le déclarant soumet son incident pour traitement
const soumettre = async (id, userId) => {
  const incident = await getIncidentById(id);
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);
  if (incident.statut !== "BROUILLON")
    throw new ErreurMetier(`Impossible de soumettre un incident en statut "${incident.statut}". Statut attendu : BROUILLON.`);
  if (incident.declareParId !== userId)
    throw new ErreurMetier("Seul le déclarant peut soumettre cet incident.", 403);

  return await prisma.incident.update({
    where: { id },
    data: { statut: "OUVERT" },
    include: { declarePar: { select: { id: true, nom: true, prenom: true, email: true } }, site: true },
  });
};

// OUVERT → EN_COURS : un responsable QHSE/ADMIN valide (pas le déclarant)
const valider = async (id, userId) => {
  const incident = await getIncidentById(id);
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);
  if (incident.statut !== "OUVERT")
    throw new ErreurMetier(`Impossible de valider un incident en statut "${incident.statut}". Statut attendu : OUVERT.`);
  if (incident.declareParId === userId)
    throw new ErreurMetier("Un responsable ne peut pas valider son propre incident.", 403);

  return await prisma.incident.update({
    where: { id },
    data: { statut: "EN_COURS", valideParId: userId },
    include: { declarePar: { select: { id: true, nom: true, prenom: true, email: true } }, site: true },
  });
};

// OUVERT → REJETE : un responsable QHSE/ADMIN rejette l'incident avec un motif obligatoire
const rejeter = async (id, motifRejet) => {
  if (!motifRejet || motifRejet.trim().length < 5)
    throw new ErreurMetier("Le motif de rejet est obligatoire (min. 5 caractères).");

  const incident = await getIncidentById(id);
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);
  if (incident.statut !== "OUVERT")
    throw new ErreurMetier(`Impossible de rejeter un incident en statut "${incident.statut}". Statut attendu : OUVERT.`);

  return await prisma.incident.update({
    where: { id },
    data: { statut: "REJETE", motifRejet: motifRejet.trim() },
    include: { declarePar: { select: { id: true, nom: true, prenom: true, email: true } }, site: true },
  });
};

// EN_COURS → CLOS : un responsable QHSE/ADMIN clôture l'incident
const cloturer = async (id) => {
  const incident = await getIncidentById(id);
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);
  if (incident.statut !== "EN_COURS")
    throw new ErreurMetier(`Impossible de clôturer un incident en statut "${incident.statut}". Statut attendu : EN_COURS.`);

  return await prisma.incident.update({
    where: { id },
    data: { statut: "CLOS", dateCloture: new Date() },
    include: { declarePar: { select: { id: true, nom: true, prenom: true, email: true } }, site: true },
  });
};

// Export de toutes les fonctions du service
module.exports = {
  getAllIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
  soumettre,
  valider,
  rejeter,
  cloturer,
};