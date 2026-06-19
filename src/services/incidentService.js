// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

// Erreur métier avec code HTTP — permet aux contrôleurs de renvoyer 400/403 au lieu de 500
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Génère un numéro de référence unique : INC-2026-0001
const genererReference = async () => {
  const annee = new Date().getFullYear();
  // Cherche la référence la plus haute de l'année en cours
  // (résistant aux suppressions : on ne compte pas, on lit le max réel)
  const dernier = await prisma.incident.findFirst({
    where: { numeroReference: { startsWith: `INC-${annee}-` } },
    orderBy: { numeroReference: "desc" },
  });
  // Extrait le compteur depuis "INC-2026-0003" → 3, ou démarre à 0
  const dernierNumero = dernier
    ? parseInt(dernier.numeroReference.split("-")[2], 10)
    : 0;
  return `INC-${annee}-${String(dernierNumero + 1).padStart(4, "0")}`;
};

// Récupère tous les incidents (avec déclarant et site)
const getAllIncidents = async () => {
  return await prisma.incident.findMany({
    include: {
      declarePar: { select: { id: true, nom: true, prenom: true, email: true } },
      site: true,
    },
    orderBy: { createdAt: "desc" },
  });
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

// Crée un nouvel incident
const createIncident = async (data) => {
  // La date de l'incident ne peut pas être dans le futur
  if (new Date(data.dateIncident) > new Date()) {
    throw new ErreurMetier("La date de l'incident ne peut pas être dans le futur.");
  }

  const numeroReference = await genererReference();

  return await prisma.incident.create({
    data: {
      numeroReference,
      type: data.type,
      description: data.description,
      gravite: data.gravite,
      latitude: data.latitude,
      longitude: data.longitude,
      adresseLisible: data.adresseLisible,
      photoUrl: data.photoUrl,
      dateIncident: new Date(data.dateIncident),
      declareParId: data.declareParId,
      siteId: data.siteId,
    },
  });
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

// OUVERT → REJETE : un responsable QHSE/ADMIN rejette l'incident
const rejeter = async (id) => {
  const incident = await getIncidentById(id);
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);
  if (incident.statut !== "OUVERT")
    throw new ErreurMetier(`Impossible de rejeter un incident en statut "${incident.statut}". Statut attendu : OUVERT.`);

  return await prisma.incident.update({
    where: { id },
    data: { statut: "REJETE" },
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