// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

// Récupère tous les EPI (avec leur site)
const getAllEpis = async () => {
  return await prisma.epi.findMany({
    include: { site: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "desc" },
  });
};

// Récupère un EPI par son id
const getEpiById = async (id) => {
  return await prisma.epi.findUnique({
    where: { id },
    include: { site: true },
  });
};

// Crée un nouvel EPI
const createEpi = async (data) => {
  return await prisma.epi.create({
    data: {
      designation: data.designation,
      type: data.type,
      reference: data.reference,
      quantite: data.quantite,
      seuilAlerte: data.seuilAlerte,
      statut: data.statut,
      datePeremption: data.datePeremption ? new Date(data.datePeremption) : null,
      siteId: data.siteId,
    },
  });
};

// Met à jour un EPI
const updateEpi = async (id, data) => {
  return await prisma.epi.update({
    where: { id },
    data,
  });
};

// Supprime un EPI
const deleteEpi = async (id) => {
  return await prisma.epi.delete({
    where: { id },
  });
};

// Récupère les EPI dont le stock est sous le seuil d'alerte
const getEpisEnAlerte = async () => {
  // On récupère tous les EPI, puis on filtre ceux sous leur seuil
  const epis = await prisma.epi.findMany({
    include: { site: { select: { nom: true } } },
  });
  // Filtre : quantité <= seuil d'alerte
  return epis.filter((epi) => epi.quantite <= epi.seuilAlerte);
};

// Export de toutes les fonctions du service
module.exports = {
  getAllEpis,
  getEpiById,
  createEpi,
  updateEpi,
  deleteEpi,
  getEpisEnAlerte,
};