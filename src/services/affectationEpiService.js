// Affectation des EPI aux employés : un EPI affecté quitte le stock
// disponible (quantite décrémentée) et y revient lorsqu'il est rendu.
const prisma = require("../config/prisma");
const { enregistrer: enregistrerHistorique } = require("./historiqueEpiService");

// Erreur métier avec code HTTP — cohérent avec les autres services
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Include partagé : EPI (désignation + référence) et employé (nom + rôle)
const INCLUDE_AFFECTATION = {
  epi:     { select: { id: true, designation: true, type: true, reference: true } },
  employe: { select: { id: true, nom: true, prenom: true, role: true } },
};

// Affecte un EPI à un employé : crée l'affectation ACTIVE et décrémente le
// stock disponible de l'EPI (l'unité affectée n'est plus disponible en stock).
// Les deux opérations sont dans une même transaction pour rester cohérentes.
const affecter = async (epiId, employeId, poste, entrepriseId, auteurId) => {
  const epi = await prisma.epi.findFirst({ where: { id: epiId, site: { entrepriseId } } });
  if (!epi) throw new ErreurMetier("EPI introuvable.", 404);
  if (epi.quantite <= 0) {
    throw new ErreurMetier("Stock insuffisant pour affecter cet EPI.");
  }
  if (epi.datePeremption && new Date(epi.datePeremption) < new Date()) {
    throw new ErreurMetier("Cet EPI est périmé et ne peut pas être affecté.");
  }

  const employe = await prisma.user.findFirst({ where: { id: employeId, entrepriseId } });
  if (!employe) throw new ErreurMetier("Employé introuvable.", 404);

  const affectation = await prisma.$transaction(async (tx) => {
    const affectation = await tx.affectationEpi.create({
      data: { epiId, employeId, poste: poste || null },
      include: INCLUDE_AFFECTATION,
    });
    await tx.epi.update({
      where: { id: epiId },
      data: { quantite: { decrement: 1 } },
    });
    return affectation;
  });
  await enregistrerHistorique(
    epiId,
    auteurId,
    "EPI affecté",
    `${employe.prenom} ${employe.nom}${poste ? ` (${poste})` : ""}`
  );
  return affectation;
};

// Rend un EPI affecté : passe l'affectation à RENDUE, remplit dateRetour et
// réincrémente le stock disponible de l'EPI.
const rendre = async (affectationId, entrepriseId, auteurId) => {
  const affectation = await prisma.affectationEpi.findFirst({
    where: { id: affectationId, epi: { site: { entrepriseId } } },
    include: INCLUDE_AFFECTATION,
  });
  if (!affectation) throw new ErreurMetier("Affectation introuvable.", 404);
  if (affectation.statut === "RENDUE") {
    throw new ErreurMetier("Cet EPI a déjà été rendu.");
  }

  const mise_a_jour = await prisma.$transaction(async (tx) => {
    const mise_a_jour = await tx.affectationEpi.update({
      where: { id: affectationId },
      data: { statut: "RENDUE", dateRetour: new Date() },
      include: INCLUDE_AFFECTATION,
    });
    await tx.epi.update({
      where: { id: affectation.epiId },
      data: { quantite: { increment: 1 } },
    });
    return mise_a_jour;
  });
  await enregistrerHistorique(
    affectation.epiId,
    auteurId,
    "EPI rendu",
    `${affectation.employe.prenom} ${affectation.employe.nom}`
  );
  return mise_a_jour;
};

// Historique des affectations d'un EPI donné, du plus récent au plus ancien
const getAffectationsByEpi = async (epiId, entrepriseId) => {
  return await prisma.affectationEpi.findMany({
    where: { epiId, epi: { site: { entrepriseId } } },
    include: INCLUDE_AFFECTATION,
    orderBy: { dateAffectation: "desc" },
  });
};

// EPI actuellement ou anciennement affectés à un employé donné
const getAffectationsByEmploye = async (employeId) => {
  return await prisma.affectationEpi.findMany({
    where: { employeId },
    include: INCLUDE_AFFECTATION,
    orderBy: { dateAffectation: "desc" },
  });
};

// Journal global de toutes les affectations, scopé à l'entreprise du
// demandeur (isolation multi-tenant, même principe que getAllActions).
const getToutesAffectations = async (entrepriseId) => {
  return await prisma.affectationEpi.findMany({
    where: { epi: { site: { entrepriseId } } },
    include: INCLUDE_AFFECTATION,
    orderBy: { dateAffectation: "desc" },
  });
};

module.exports = {
  affecter,
  rendre,
  getAffectationsByEpi,
  getAffectationsByEmploye,
  getToutesAffectations,
};
