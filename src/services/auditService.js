// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

// Génère une référence unique : AUD-2026-0001
const genererReference = async () => {
  const annee = new Date().getFullYear();
  const count = await prisma.audit.count();
  const numero = String(count + 1).padStart(4, "0");
  return `AUD-${annee}-${numero}`;
};

// Récupère tous les audits (avec auditeur et site)
const getAllAudits = async () => {
  return await prisma.audit.findMany({
    include: {
      auditeur: { select: { id: true, nom: true, prenom: true } },
      site: { select: { id: true, nom: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

// Récupère un audit par son id
const getAuditById = async (id) => {
  return await prisma.audit.findUnique({
    where: { id },
    include: {
      auditeur: { select: { id: true, nom: true, prenom: true } },
      site: true,
    },
  });
};

// Crée un nouvel audit
const createAudit = async (data) => {
  // Génération automatique de la référence
  const reference = await genererReference();

  return await prisma.audit.create({
    data: {
      reference,
      titre: data.titre,
      type: data.type,
      statut: data.statut,
      datePrevue: new Date(data.datePrevue),
      dateRealisee: data.dateRealisee ? new Date(data.dateRealisee) : null,
      scoreConformite: data.scoreConformite,
      observations: data.observations,
      auditeurId: data.auditeurId,
      siteId: data.siteId,
    },
  });
};

// Met à jour un audit
const updateAudit = async (id, data) => {
  return await prisma.audit.update({
    where: { id },
    data,
  });
};

// Supprime un audit
const deleteAudit = async (id) => {
  return await prisma.audit.delete({
    where: { id },
  });
};

// Export de toutes les fonctions du service
module.exports = {
  getAllAudits,
  getAuditById,
  createAudit,
  updateAudit,
  deleteAudit,
};