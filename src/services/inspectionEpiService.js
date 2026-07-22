// Historique des inspections d'EPI : chaque inspection est un événement daté
// et immuable, contrairement à l'ancien champ dateDerniereInspection qui
// était écrasé à chaque inspection et ne conservait aucun historique.
const prisma = require("../config/prisma");

// Erreur métier avec code HTTP — cohérent avec les autres services
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Include partagé : EPI (désignation + référence) et inspecteur (nom)
const INCLUDE_INSPECTION = {
  epi:        { select: { id: true, designation: true, type: true, reference: true } },
  inspecteur: { select: { id: true, nom: true, prenom: true } },
};

// Enregistre une nouvelle inspection pour un EPI donné
const enregistrerInspection = async (epiId, { dateInspection, conforme, commentaire, inspecteurId }) => {
  const epi = await prisma.epi.findUnique({ where: { id: epiId } });
  if (!epi) throw new ErreurMetier("EPI introuvable.", 404);

  return await prisma.inspectionEpi.create({
    data: {
      epiId,
      dateInspection: dateInspection ? new Date(dateInspection) : new Date(),
      conforme: conforme ?? true,
      commentaire: commentaire || null,
      inspecteurId: inspecteurId || null,
    },
    include: INCLUDE_INSPECTION,
  });
};

// Historique des inspections d'un EPI donné, du plus récent au plus ancien
const getInspectionsByEpi = async (epiId) => {
  return await prisma.inspectionEpi.findMany({
    where: { epiId },
    include: INCLUDE_INSPECTION,
    orderBy: { dateInspection: "desc" },
  });
};

// Journal global de toutes les inspections, scopé à l'entreprise du
// demandeur (isolation multi-tenant, même principe que getToutesAffectations).
const getToutesInspections = async (entrepriseId) => {
  return await prisma.inspectionEpi.findMany({
    where: { epi: { site: { entrepriseId } } },
    include: INCLUDE_INSPECTION,
    orderBy: { dateInspection: "desc" },
  });
};

module.exports = {
  enregistrerInspection,
  getInspectionsByEpi,
  getToutesInspections,
};
