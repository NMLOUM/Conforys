// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");
const { enregistrer } = require("./historiqueService");
const { creer: creerNotification, creerPourPlusieurs } = require("./notificationService");

// Labels lisibles pour les statuts (utilisés dans les messages d'historique)
const LABEL_STATUT = {
  BROUILLON: "Brouillon",
  OUVERT:    "Ouvert",
  EN_COURS:  "En cours",
  CLOS:      "Clôturé",
  REJETE:    "Rejeté",
};

const LABEL_TYPE_INCIDENT = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presqu'accident",
  SITUATION_DANGEREUSE:     "Situation dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Incident environnemental",
};
const LABEL_GRAVITE = { FAIBLE: "faible", MOYEN: "moyenne", GRAVE: "grave", CRITIQUE: "critique" };

// Notifie tous les RESPONSABLE_QHSE actifs de l'entreprise qu'un incident
// vient d'être déclaré. Titre plus urgent si la gravité est CRITIQUE.
// N'échoue jamais l'opération principale (voir notificationService.creer).
const notifierDeclaration = async (incident, entrepriseId) => {
  const destinataires = await prisma.user.findMany({
    where: { entrepriseId, role: "RESPONSABLE_QHSE", actif: true },
    select: { id: true },
  });

  const critique = incident.gravite === "CRITIQUE";
  const type    = critique ? "INCIDENT_CRITIQUE" : "INCIDENT_DECLARE";
  const titre   = critique ? "Incident critique déclaré" : "Nouvel incident déclaré";
  const message = `${incident.numeroReference} · ${LABEL_TYPE_INCIDENT[incident.type] ?? incident.type} de gravité ${LABEL_GRAVITE[incident.gravite] ?? incident.gravite}`;

  await creerPourPlusieurs(destinataires.map((u) => u.id), type, titre, message, `/incidents/${incident.id}`);
};

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
  // Un EMPLOYE voit les incidents qu'il a déclarés ET ceux qui lui ont été
  // assignés pour traitement (même s'il n'en est pas le déclarant).
  const scopeWhere =
    role === "EMPLOYE"
      ? { declarePar: { entrepriseId }, OR: [{ declareParId: userId }, { assigneAId: userId }] }
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

// Un EMPLOYE ne peut accéder qu'aux incidents qu'il a déclarés ou qui lui
// sont assignés pour traitement — même règle que le scope de getAllIncidents.
// QHSE/ADMIN accèdent à tout incident de leur entreprise (déjà garanti par le
// filtre entrepriseId). `demandeur` est optionnel : les appels internes du
// workflow (soumettre/valider/rejeter/cloturer/PDF), déjà protégés par leurs
// propres vérifications ou par le rôle exigé sur la route, restent inchangés.
const peutAccederIncident = (incident, demandeur) => {
  if (!demandeur || demandeur.role !== "EMPLOYE") return true;
  return incident.declareParId === demandeur.userId || incident.assigneAId === demandeur.userId;
};

// Récupère un incident par son id — scopé à l'entreprise du demandeur (renvoie
// null si l'incident n'existe pas, appartient à une autre entreprise, ou si le
// demandeur (EMPLOYE) n'en est ni le déclarant ni l'assigné).
const getIncidentById = async (id, entrepriseId, demandeur = null) => {
  const incident = await prisma.incident.findFirst({
    where: { id, declarePar: { entrepriseId } },
    include: {
      declarePar: { select: { id: true, nom: true, prenom: true, email: true } },
      validePar: { select: { id: true, nom: true, prenom: true, email: true } },
      assigneA: { select: { id: true, nom: true, prenom: true, email: true } },
      site: true,
    },
  });
  if (!incident || !peutAccederIncident(incident, demandeur)) return null;
  return incident;
};

// Crée un nouvel incident dans une transaction atomique avec retry anti-collision.
// La génération de la référence et l'insertion sont dans le même $transaction :
// si deux requêtes simultanées génèrent la même référence, la contrainte @unique
// déclenche une erreur P2002 sur la seconde — on réessaie jusqu'à 3 fois.
const createIncident = async (data, userId, entrepriseId) => {
  if (new Date(data.dateIncident) > new Date()) {
    throw new ErreurMetier("La date de l'incident ne peut pas être dans le futur.");
  }

  // Le site déclaré doit appartenir à l'entreprise du déclarant — empêche de
  // rattacher un incident à un site d'une autre entreprise (id deviné/énuméré).
  const site = await prisma.site.findFirst({ where: { id: data.siteId, entrepriseId } });
  if (!site) throw new ErreurMetier("Site introuvable.", 404);

  for (let tentative = 0; tentative < 3; tentative++) {
    try {
      const incident = await prisma.$transaction(async (tx) => {
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
      // Piste d'audit — après la transaction pour ne pas l'inclure dans le rollback éventuel
      await enregistrer(incident.id, userId, "Incident déclaré", `Référence : ${incident.numeroReference}`);

      // Notification des QHSE de l'entreprise — best-effort, ne bloque jamais la déclaration
      await notifierDeclaration(incident, entrepriseId);

      return incident;
    } catch (err) {
      // P2002 = violation contrainte unique sur numeroReference (collision simultanée)
      if (err.code === "P2002" && tentative < 2) continue;
      throw err;
    }
  }
};

// Met à jour un incident — vérifie d'abord qu'il appartient à l'entreprise du demandeur.
// `data` est déjà restreint aux champs hors-workflow par updateIncidentSchema
// (statut/déclarant/site ne peuvent pas être modifiés ici).
const updateIncident = async (id, data, entrepriseId, userId) => {
  const existant = await prisma.incident.findFirst({ where: { id, declarePar: { entrepriseId } } });
  if (!existant) throw new ErreurMetier("Incident introuvable.", 404);

  const mis_a_jour = await prisma.incident.update({
    where: { id },
    data: {
      ...data,
      // Prisma 7 exige un DateTime ISO complet — le champ "datetime-local" du
      // formulaire ne fournit qu'une chaîne tronquée ("AAAA-MM-JJTHH:mm").
      ...(data.dateIncident !== undefined && { dateIncident: new Date(data.dateIncident) }),
    },
  });
  await enregistrer(id, userId, "Incident modifié");
  return mis_a_jour;
};

// Supprime un incident — vérifie d'abord qu'il appartient à l'entreprise du demandeur
const deleteIncident = async (id, entrepriseId) => {
  const existant = await prisma.incident.findFirst({ where: { id, declarePar: { entrepriseId } } });
  if (!existant) throw new ErreurMetier("Incident introuvable.", 404);

  return await prisma.incident.delete({
    where: { id },
  });
};

// ── Workflow de statuts ────────────────────────────────────────────────────────

// BROUILLON → OUVERT : le déclarant soumet son incident pour traitement
const soumettre = async (id, userId, entrepriseId) => {
  const incident = await getIncidentById(id, entrepriseId);
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);
  if (incident.statut !== "BROUILLON")
    throw new ErreurMetier(`Impossible de soumettre un incident en statut "${incident.statut}". Statut attendu : BROUILLON.`);
  if (incident.declareParId !== userId)
    throw new ErreurMetier("Seul le déclarant peut soumettre cet incident.", 403);

  const mis_a_jour = await prisma.incident.update({
    where: { id },
    data: { statut: "OUVERT" },
    include: { declarePar: { select: { id: true, nom: true, prenom: true, email: true } }, site: true },
  });
  await enregistrer(id, userId, `Statut changé : ${LABEL_STATUT.BROUILLON} → ${LABEL_STATUT.OUVERT}`);
  return mis_a_jour;
};

// OUVERT → EN_COURS : un responsable QHSE/ADMIN valide et assigne dans le
// même geste un employé qui va traiter l'incident — un incident validé sans
// personne pour le prendre en charge n'a pas de sens métier.
const valider = async (id, employeId, userId, entrepriseId) => {
  const incident = await getIncidentById(id, entrepriseId);
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);
  if (incident.statut !== "OUVERT")
    throw new ErreurMetier(`Impossible de valider un incident en statut "${incident.statut}". Statut attendu : OUVERT.`);

  const employe = await prisma.user.findFirst({ where: { id: employeId, entrepriseId } });
  if (!employe) throw new ErreurMetier("Employé introuvable dans votre entreprise.", 404);

  const mis_a_jour = await prisma.incident.update({
    where: { id },
    data: { statut: "EN_COURS", valideParId: userId, assigneAId: employeId },
    include: {
      declarePar: { select: { id: true, nom: true, prenom: true, email: true } },
      assigneA:   { select: { id: true, nom: true, prenom: true, email: true } },
      site: true,
    },
  });
  await enregistrer(
    id, userId,
    `Statut changé : ${LABEL_STATUT.OUVERT} → ${LABEL_STATUT.EN_COURS}`,
    `Assigné à ${employe.prenom} ${employe.nom} pour traitement`
  );
  await creerNotification(
    employeId, "INCIDENT_ASSIGNE", "Incident assigné",
    `${incident.numeroReference} vous a été assigné pour traitement.`, `/incidents/${id}`
  );
  return mis_a_jour;
};

// OUVERT → REJETE : un responsable QHSE/ADMIN rejette l'incident avec un motif obligatoire
const rejeter = async (id, motifRejet, userId, entrepriseId) => {
  if (!motifRejet || motifRejet.trim().length < 5)
    throw new ErreurMetier("Le motif de rejet est obligatoire (min. 5 caractères).");

  const incident = await getIncidentById(id, entrepriseId);
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);
  if (incident.statut !== "OUVERT")
    throw new ErreurMetier(`Impossible de rejeter un incident en statut "${incident.statut}". Statut attendu : OUVERT.`);

  const mis_a_jour = await prisma.incident.update({
    where: { id },
    data: { statut: "REJETE", motifRejet: motifRejet.trim() },
    include: { declarePar: { select: { id: true, nom: true, prenom: true, email: true } }, site: true },
  });
  await enregistrer(id, userId, `Statut changé : ${LABEL_STATUT.OUVERT} → ${LABEL_STATUT.REJETE}`, `Motif : ${motifRejet.trim()}`);
  return mis_a_jour;
};

// EN_COURS → CLOS : un responsable QHSE/ADMIN clôture l'incident
const cloturer = async (id, userId, entrepriseId) => {
  const incident = await getIncidentById(id, entrepriseId);
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);
  if (incident.statut !== "EN_COURS")
    throw new ErreurMetier(`Impossible de clôturer un incident en statut "${incident.statut}". Statut attendu : EN_COURS.`);

  const mis_a_jour = await prisma.incident.update({
    where: { id },
    data: { statut: "CLOS", dateCloture: new Date() },
    include: { declarePar: { select: { id: true, nom: true, prenom: true, email: true } }, site: true },
  });
  await enregistrer(id, userId, `Statut changé : ${LABEL_STATUT.EN_COURS} → ${LABEL_STATUT.CLOS}`);
  return mis_a_jour;
};

// Export de toutes les fonctions du service
module.exports = {
  getAllIncidents,
  getIncidentById,
  peutAccederIncident,
  createIncident,
  updateIncident,
  deleteIncident,
  soumettre,
  valider,
  rejeter,
  cloturer,
};