// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

// Récupère toutes les formations (avec site et participants)
const getAllFormations = async () => {
  return await prisma.formation.findMany({
    include: {
      site:         { select: { id: true, nom: true } },
      participants: { select: { id: true, nom: true, prenom: true, email: true } },
    },
    orderBy: { dateDebut: "desc" },
  });
};

// Récupère une formation par son id
const getFormationById = async (id) => {
  return await prisma.formation.findUnique({
    where: { id },
    include: {
      site:         { select: { id: true, nom: true } },
      participants: { select: { id: true, nom: true, prenom: true, email: true } },
    },
  });
};

// Crée une nouvelle formation
const createFormation = async (data) => {
  // participantIds est un tableau d'ids d'utilisateurs à connecter (optionnel)
  const { participantIds, siteId, dateDebut, dateFin, ...rest } = data;

  return await prisma.formation.create({
    data: {
      ...rest,
      dateDebut: new Date(dateDebut),
      dateFin:   dateFin ? new Date(dateFin) : null,
      site:         { connect: { id: siteId } },
      // Connexion des participants via la relation many-to-many
      participants: participantIds?.length
        ? { connect: participantIds.map((id) => ({ id })) }
        : undefined,
    },
    include: {
      site:         { select: { id: true, nom: true } },
      participants: { select: { id: true, nom: true, prenom: true } },
    },
  });
};

// Met à jour une formation existante
const updateFormation = async (id, data) => {
  const { participantIds, dateDebut, dateFin, ...rest } = data;

  // Construction de l'objet de mise à jour (uniquement les champs fournis)
  const dataToUpdate = { ...rest };
  if (dateDebut) dataToUpdate.dateDebut = new Date(dateDebut);
  if (dateFin)   dataToUpdate.dateFin   = new Date(dateFin);

  // Si de nouveaux participants sont fournis, on remplace la liste (set)
  if (participantIds) {
    dataToUpdate.participants = { set: participantIds.map((id) => ({ id })) };
  }

  return await prisma.formation.update({
    where: { id },
    data:  dataToUpdate,
    include: {
      site:         { select: { id: true, nom: true } },
      participants: { select: { id: true, nom: true, prenom: true } },
    },
  });
};

// Supprime une formation
const deleteFormation = async (id) => {
  return await prisma.formation.delete({ where: { id } });
};

// Export de toutes les fonctions du service
module.exports = {
  getAllFormations,
  getFormationById,
  createFormation,
  updateFormation,
  deleteFormation,
};
