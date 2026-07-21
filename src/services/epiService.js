// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

// ── Niveau d'alerte calculé (OK / BIENTOT / ALERTE) ──────────────────────────
//
// Ce niveau n'est jamais stocké : il est recalculé à chaque lecture à partir
// du stock et de la date de péremption, qui évoluent avec le temps sans
// action explicite sur l'EPI. Il est distinct du champ `statut` (StatutEpi),
// qui reste un état de gestion manuel (disponible / en rupture / périmé /
// en commande — la commande étant une perspective non traitée ici).
//
// Règles :
//   - ALERTE  : stock au seuil ou en dessous, OU date de péremption dépassée
//   - BIENTOT : péremption dans moins de 30 jours, OU stock à moins de 20 %
//               au-dessus du seuil (proche de basculer en alerte)
//   - OK      : sinon
const calculerNiveauAlerte = (epi) => {
  const maintenant = new Date();
  const perime    = epi.datePeremption && new Date(epi.datePeremption) < maintenant;
  const enRupture = epi.quantite <= epi.seuilAlerte;

  if (perime || enRupture) return "ALERTE";

  const joursAvantPeremption = epi.datePeremption
    ? (new Date(epi.datePeremption) - maintenant) / MS_PAR_JOUR
    : null;
  const peremptionProche = joursAvantPeremption != null && joursAvantPeremption <= 30;
  const stockProche = epi.seuilAlerte > 0 && epi.quantite <= Math.ceil(epi.seuilAlerte * 1.2);

  if (peremptionProche || stockProche) return "BIENTOT";

  return "OK";
};

// Annote un EPI (objet Prisma) avec son niveau d'alerte calculé
const avecNiveauAlerte = (epi) => ({ ...epi, niveauAlerte: calculerNiveauAlerte(epi) });

// Convertit en objets Date les champs de date fournis en chaînes — nécessaire
// car Prisma 7 exige un DateTime ISO complet, pas une simple chaîne "AAAA-MM-JJ".
const normaliserDates = (data) => ({
  ...data,
  ...(data.datePeremption !== undefined && {
    datePeremption: data.datePeremption ? new Date(data.datePeremption) : null,
  }),
  ...(data.dateDerniereInspection !== undefined && {
    dateDerniereInspection: data.dateDerniereInspection ? new Date(data.dateDerniereInspection) : null,
  }),
});

// Récupère tous les EPI (avec leur site et leur niveau d'alerte calculé)
const getAllEpis = async () => {
  const epis = await prisma.epi.findMany({
    include: { site: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "desc" },
  });
  return epis.map(avecNiveauAlerte);
};

// Récupère un EPI par son id
const getEpiById = async (id) => {
  const epi = await prisma.epi.findUnique({
    where: { id },
    include: { site: true },
  });
  return epi ? avecNiveauAlerte(epi) : null;
};

// Crée un nouvel EPI
const createEpi = async (data) => {
  const epi = await prisma.epi.create({
    data: {
      designation: data.designation,
      type: data.type,
      reference: data.reference,
      quantite: data.quantite,
      seuilAlerte: data.seuilAlerte,
      statut: data.statut,
      datePeremption: data.datePeremption ? new Date(data.datePeremption) : null,
      dateDerniereInspection: data.dateDerniereInspection ? new Date(data.dateDerniereInspection) : null,
      siteId: data.siteId,
    },
    include: { site: { select: { id: true, nom: true } } },
  });
  return avecNiveauAlerte(epi);
};

// Met à jour un EPI
const updateEpi = async (id, data) => {
  const epi = await prisma.epi.update({
    where: { id },
    data: normaliserDates(data),
    include: { site: { select: { id: true, nom: true } } },
  });
  return avecNiveauAlerte(epi);
};

// Supprime un EPI
const deleteEpi = async (id) => {
  return await prisma.epi.delete({
    where: { id },
  });
};

// EPI en alerte : stock critique OU péremption dans moins de 30 jours
// (regroupe les niveaux ALERTE et BIENTOT calculés ci-dessus)
const getEpisEnAlerte = async () => {
  const epis = await prisma.epi.findMany({
    include: { site: { select: { nom: true } } },
  });
  return epis
    .map(avecNiveauAlerte)
    .filter((epi) => epi.niveauAlerte !== "OK");
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
