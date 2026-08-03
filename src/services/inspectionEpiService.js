// Historique des inspections d'EPI : chaque inspection est un événement daté
// et immuable, contrairement à l'ancien champ dateDerniereInspection qui
// était écrasé à chaque inspection et ne conservait aucun historique.
const prisma = require("../config/prisma");
const { enregistrer: enregistrerHistorique } = require("./historiqueEpiService");

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
const enregistrerInspection = async (epiId, { dateInspection, conforme, commentaire, inspecteurId }, entrepriseId) => {
  const epi = await prisma.epi.findFirst({ where: { id: epiId, site: { entrepriseId } } });
  if (!epi) throw new ErreurMetier("EPI introuvable.", 404);

  const inspection = await prisma.inspectionEpi.create({
    data: {
      epiId,
      dateInspection: dateInspection ? new Date(dateInspection) : new Date(),
      conforme: conforme ?? true,
      commentaire: commentaire || null,
      inspecteurId: inspecteurId || null,
    },
    include: INCLUDE_INSPECTION,
  });
  // Pas d'auteur connu (inspecteurId absent) : pas d'entrée d'historique,
  // enregistrer() exige un auteurId valide.
  if (inspecteurId) {
    await enregistrerHistorique(
      epiId,
      inspecteurId,
      "Inspection enregistrée",
      conforme === false ? `Non conforme${commentaire ? ` : ${commentaire}` : ""}` : "Conforme"
    );
  }
  return inspection;
};

// Historique des inspections d'un EPI donné, du plus récent au plus ancien
const getInspectionsByEpi = async (epiId, entrepriseId) => {
  return await prisma.inspectionEpi.findMany({
    where: { epiId, epi: { site: { entrepriseId } } },
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
