// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

// Récupère toutes les habilitations (avec le titulaire)
const getAllHabilitations = async () => {
  return await prisma.habilitation.findMany({
    include: {
      titulaire: { select: { id: true, nom: true, prenom: true, email: true } },
    },
    orderBy: { dateExpiration: "asc" },
  });
};

// Récupère une habilitation par son id
const getHabilitationById = async (id) => {
  return await prisma.habilitation.findUnique({
    where: { id },
    include: {
      titulaire: { select: { id: true, nom: true, prenom: true, email: true } },
    },
  });
};

// Crée une nouvelle habilitation
const createHabilitation = async (data) => {
  return await prisma.habilitation.create({
    data: {
      intitule:      data.intitule,
      type:          data.type,
      niveau:        data.niveau,
      dateObtention: new Date(data.dateObtention),
      dateExpiration: new Date(data.dateExpiration),
      statut:        data.statut,
      titulaireId:   data.titulaireId,
    },
  });
};

// Met à jour une habilitation existante
const updateHabilitation = async (id, data) => {
  // Construction de l'objet de mise à jour (uniquement les champs fournis)
  const dataToUpdate = {};
  if (data.intitule)       dataToUpdate.intitule       = data.intitule;
  if (data.type)           dataToUpdate.type           = data.type;
  if (data.niveau !== undefined) dataToUpdate.niveau   = data.niveau;
  if (data.statut)         dataToUpdate.statut         = data.statut;
  if (data.titulaireId)    dataToUpdate.titulaireId    = data.titulaireId;
  if (data.dateObtention)  dataToUpdate.dateObtention  = new Date(data.dateObtention);
  if (data.dateExpiration) dataToUpdate.dateExpiration = new Date(data.dateExpiration);

  return await prisma.habilitation.update({ where: { id }, data: dataToUpdate });
};

// Supprime une habilitation
const deleteHabilitation = async (id) => {
  return await prisma.habilitation.delete({ where: { id } });
};

// LOGIQUE MÉTIER : retourne les habilitations expirant dans moins de 30 jours
const getHabilitationsExpirantes = async () => {
  const maintenant  = new Date();
  const dans30Jours = new Date();
  dans30Jours.setDate(dans30Jours.getDate() + 30);

  // On cherche les habilitations dont la date d'expiration est entre aujourd'hui et J+30
  return await prisma.habilitation.findMany({
    where: {
      dateExpiration: {
        gte: maintenant,   // pas encore expirées
        lte: dans30Jours,  // mais dans moins de 30 jours
      },
    },
    include: {
      titulaire: { select: { id: true, nom: true, prenom: true, email: true } },
    },
    orderBy: { dateExpiration: "asc" },
  });
};

// Export de toutes les fonctions du service
module.exports = {
  getAllHabilitations,
  getHabilitationById,
  createHabilitation,
  updateHabilitation,
  deleteHabilitation,
  getHabilitationsExpirantes,
};
