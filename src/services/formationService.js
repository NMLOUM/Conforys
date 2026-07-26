// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");
const attestationService = require("./attestationService");

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

// Erreur métier avec code HTTP — cohérent avec les autres services
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Include partagé : site + participations (avec les infos du participant)
const INCLUDE_FORMATION = {
  site: { select: { id: true, nom: true } },
  participations: {
    include: { participant: { select: { id: true, nom: true, prenom: true, email: true, role: true } } },
  },
};

// Récupère toutes les formations (avec site et participations) — scopées à
// l'entreprise du demandeur
const getAllFormations = async (entrepriseId) => {
  return await prisma.formation.findMany({
    where: { site: { entrepriseId } },
    include: INCLUDE_FORMATION,
    orderBy: { dateDebut: "desc" },
  });
};

// Récupère une formation par son id — renvoie null si elle n'existe pas ou
// appartient à une autre entreprise
const getFormationById = async (id, entrepriseId) => {
  return await prisma.formation.findFirst({
    where: { id, site: { entrepriseId } },
    include: INCLUDE_FORMATION,
  });
};

// Vérifie que le site visé appartient bien à l'entreprise du demandeur
const verifierSite = async (siteId, entrepriseId) => {
  const site = await prisma.site.findFirst({ where: { id: siteId, entrepriseId } });
  if (!site) throw new ErreurMetier("Site introuvable.", 404);
};

// Crée une nouvelle formation
const createFormation = async (data, entrepriseId) => {
  // participantIds est un tableau d'ids d'utilisateurs à inscrire (optionnel)
  const { participantIds, siteId, dateDebut, dateFin, ...rest } = data;
  await verifierSite(siteId, entrepriseId);

  return await prisma.formation.create({
    data: {
      ...rest,
      dateDebut: new Date(dateDebut),
      dateFin:   dateFin ? new Date(dateFin) : null,
      site: { connect: { id: siteId } },
      participations: participantIds?.length
        ? { create: participantIds.map((participantId) => ({ participantId })) }
        : undefined,
    },
    include: INCLUDE_FORMATION,
  });
};

// Met à jour une formation existante. La liste de participants, si fournie,
// remplace l'inscription — mais en ne touchant qu'au delta (ajouts/retraits)
// pour ne jamais écraser la présence/validation déjà enregistrée pour ceux
// qui restent inscrits.
const updateFormation = async (id, data, entrepriseId) => {
  const existante = await prisma.formation.findFirst({ where: { id, site: { entrepriseId } } });
  if (!existante) throw new ErreurMetier("Formation introuvable.", 404);

  const { participantIds, dateDebut, dateFin, ...rest } = data;

  const dataToUpdate = { ...rest };
  if (dateDebut) dataToUpdate.dateDebut = new Date(dateDebut);
  if (dateFin)   dataToUpdate.dateFin   = new Date(dateFin);

  if (participantIds) {
    const existants = await prisma.participationFormation.findMany({
      where: { formationId: id },
      select: { participantId: true },
    });
    const existantsIds = existants.map((p) => p.participantId);
    const aAjouter   = participantIds.filter((pid) => !existantsIds.includes(pid));
    const aSupprimer = existantsIds.filter((pid) => !participantIds.includes(pid));

    dataToUpdate.participations = {
      ...(aSupprimer.length > 0 && { deleteMany: { participantId: { in: aSupprimer } } }),
      ...(aAjouter.length   > 0 && { create: aAjouter.map((participantId) => ({ participantId })) }),
    };
  }

  return await prisma.formation.update({
    where: { id },
    data: dataToUpdate,
    include: INCLUDE_FORMATION,
  });
};

// Supprime une formation
const deleteFormation = async (id, entrepriseId) => {
  const existante = await prisma.formation.findFirst({ where: { id, site: { entrepriseId } } });
  if (!existante) throw new ErreurMetier("Formation introuvable.", 404);
  return await prisma.formation.delete({ where: { id } });
};

// ── Workflow de statut ───────────────────────────────────────────────────────

const changerStatut = async (id, entrepriseId, statutAttendu, nouveauStatut, messageErreur) => {
  const formation = await prisma.formation.findFirst({ where: { id, site: { entrepriseId } } });
  if (!formation) throw new ErreurMetier("Formation introuvable.", 404);
  if (formation.statut !== statutAttendu) {
    throw new ErreurMetier(messageErreur);
  }
  return await prisma.formation.update({
    where: { id },
    data: { statut: nouveauStatut },
    include: INCLUDE_FORMATION,
  });
};

const demarrer = (id, entrepriseId) =>
  changerStatut(id, entrepriseId, "PLANIFIEE", "EN_COURS", "Seule une formation planifiée peut être démarrée.");

const terminerFormation = (id, entrepriseId) =>
  changerStatut(id, entrepriseId, "EN_COURS", "TERMINEE", "Seule une formation en cours peut être terminée.");

const annuler = async (id, entrepriseId) => {
  const formation = await prisma.formation.findFirst({ where: { id, site: { entrepriseId } } });
  if (!formation) throw new ErreurMetier("Formation introuvable.", 404);
  if (formation.statut === "TERMINEE" || formation.statut === "ANNULEE") {
    throw new ErreurMetier("Cette formation ne peut plus être annulée.");
  }
  return await prisma.formation.update({
    where: { id },
    data: { statut: "ANNULEE" },
    include: INCLUDE_FORMATION,
  });
};

// ── Présence et validation par participant ───────────────────────────────────

const marquerPresence = async (formationId, participantId, present, entrepriseId) => {
  const formation = await prisma.formation.findFirst({ where: { id: formationId, site: { entrepriseId } } });
  if (!formation) throw new ErreurMetier("Formation introuvable.", 404);

  try {
    return await prisma.participationFormation.update({
      where: { formationId_participantId: { formationId, participantId } },
      data: { present },
      include: { participant: { select: { id: true, nom: true, prenom: true } } },
    });
  } catch (err) {
    if (err.code === "P2025") throw new ErreurMetier("Participation introuvable.", 404);
    throw err;
  }
};

// Valider un participant atteste qu'il a suivi la formation — impossible pour
// quelqu'un marqué absent, la présence est le préalable à la validation.
// Déclenche la délivrance automatique d'une attestation (sans doublon).
const validerParticipant = async (formationId, participantId, entrepriseId) => {
  const formation = await prisma.formation.findFirst({ where: { id: formationId, site: { entrepriseId } } });
  if (!formation) throw new ErreurMetier("Formation introuvable.", 404);

  const participation = await prisma.participationFormation.findUnique({
    where: { formationId_participantId: { formationId, participantId } },
  });
  if (!participation) throw new ErreurMetier("Participation introuvable.", 404);
  if (!participation.present) {
    throw new ErreurMetier("Impossible de valider un participant marqué absent.");
  }

  const resultat = await prisma.participationFormation.update({
    where: { formationId_participantId: { formationId, participantId } },
    data: { valide: true, dateValidation: new Date() },
    include: { participant: { select: { id: true, nom: true, prenom: true } } },
  });

  await attestationService.creerSiAbsente({
    beneficiaireId: participantId,
    titreFormation: formation.titre,
    themeFormation: formation.theme,
    dateExpiration: formation.dureeValiditeJours
      ? new Date(Date.now() + formation.dureeValiditeJours * MS_PAR_JOUR)
      : null,
    scoreObtenu: null,
    source: "SESSION",
  });

  return resultat;
};

// ── Consultation côté employé ─────────────────────────────────────────────────

const getFormationsByEmploye = async (employeId) => {
  return await prisma.participationFormation.findMany({
    where: { participantId: employeId },
    include: {
      formation: { include: { site: { select: { id: true, nom: true } } } },
    },
    orderBy: { formation: { dateDebut: "desc" } },
  });
};

// ── Statistiques (cartes de synthèse) ────────────────────────────────────────
//
// Le taux de participation ne porte que sur les formations déjà réalisées
// (EN_COURS ou TERMINEE) — une session encore PLANIFIEE n'a pas de présence
// enregistrée et fausserait le taux à la baisse.
// "Recyclages à prévoir" : formations TERMINEE datant de plus d'un an, sans
// qu'un nouveau champ de périodicité n'existe encore sur le modèle.
const UN_AN_MS = 365 * 24 * 60 * 60 * 1000;

const getStats = async (entrepriseId) => {
  const formations = await prisma.formation.findMany({
    where: { site: { entrepriseId } },
    select: {
      statut: true, dateDebut: true, dateFin: true,
      participations: { select: { present: true } },
    },
  });

  const sessionsPlanifiees = formations.filter((f) => f.statut === "PLANIFIEE").length;

  const formationsRealisees = formations.filter((f) => f.statut === "EN_COURS" || f.statut === "TERMINEE");
  const totalParticipations = formationsRealisees.reduce((acc, f) => acc + f.participations.length, 0);
  const totalPresents = formationsRealisees.reduce(
    (acc, f) => acc + f.participations.filter((p) => p.present).length, 0
  );
  const tauxParticipation = totalParticipations > 0 ? Math.round((totalPresents / totalParticipations) * 100) : 0;

  const maintenant = new Date();
  const recyclagesAPrevoir = formations.filter((f) => {
    if (f.statut !== "TERMINEE") return false;
    const dateReference = f.dateFin ?? f.dateDebut;
    return dateReference && (maintenant - new Date(dateReference)) > UN_AN_MS;
  }).length;

  return { sessionsPlanifiees, tauxParticipation, recyclagesAPrevoir };
};

// Export de toutes les fonctions du service
module.exports = {
  getAllFormations,
  getFormationById,
  createFormation,
  updateFormation,
  deleteFormation,
  demarrer,
  terminerFormation,
  annuler,
  marquerPresence,
  validerParticipant,
  getFormationsByEmploye,
  getStats,
};
