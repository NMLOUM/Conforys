// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

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
  // Génération automatique de la référence
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

// Export de toutes les fonctions du service
module.exports = {
  getAllIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
};