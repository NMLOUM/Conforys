// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

// Inclusion Prisma standard pour obtenir la dernière inspection d'un EPI
// (un seul enregistrement, le plus récent) sans charger tout l'historique.
const INCLUDE_DERNIERE_INSPECTION = {
  inspections: { orderBy: { dateInspection: "desc" }, take: 1 },
};

// ── Niveau d'alerte calculé (OK / BIENTOT / ALERTE) ──────────────────────────
//
// Ce niveau n'est jamais stocké : il est recalculé à chaque lecture à partir
// du stock, de la date de péremption et de l'échéance d'inspection, qui
// évoluent avec le temps sans action explicite sur l'EPI. Il est distinct du
// champ `statut` (StatutEpi), qui reste un état de gestion manuel (disponible
// / en rupture / périmé / en commande — la commande étant une perspective non
// traitée ici).
//
// Accepte indifféremment un EPI déjà aplati (`derniereInspection` en champ
// direct) ou brut avec l'include Prisma (`inspections: [...]`), pour que les
// autres services (dashboard, notifications, rapport PDF) puissent réutiliser
// ce calcul sans dupliquer la logique.
//
// Règles :
//   - ALERTE  : stock au seuil ou en dessous, OU péremption dépassée,
//               OU inspection en retard (échéance dépassée, ou jamais
//               inspecté alors qu'une fréquence est définie)
//   - BIENTOT : péremption dans moins de 30 jours, OU stock à moins de 20 %
//               au-dessus du seuil (proche de basculer en alerte),
//               OU prochaine inspection due dans moins de 30 jours
//   - OK      : sinon
const calculerNiveauAlerte = (epi) => {
  const maintenant = new Date();
  const perime    = epi.datePeremption && new Date(epi.datePeremption) < maintenant;
  const enRupture = epi.quantite <= epi.seuilAlerte;

  const derniereInspection = epi.derniereInspection !== undefined
    ? epi.derniereInspection
    : (epi.inspections?.[0]?.dateInspection ?? null);

  let inspectionEnRetard = false;
  let inspectionProche   = false;
  if (epi.frequenceInspectionJours) {
    if (!derniereInspection) {
      inspectionEnRetard = true; // fréquence définie mais jamais inspecté
    } else {
      const joursDepuis   = (maintenant - new Date(derniereInspection)) / MS_PAR_JOUR;
      const joursRestants = epi.frequenceInspectionJours - joursDepuis;
      if (joursRestants < 0) inspectionEnRetard = true;
      else if (joursRestants <= 30) inspectionProche = true;
    }
  }

  if (perime || enRupture || inspectionEnRetard) return "ALERTE";

  const joursAvantPeremption = epi.datePeremption
    ? (new Date(epi.datePeremption) - maintenant) / MS_PAR_JOUR
    : null;
  const peremptionProche = joursAvantPeremption != null && joursAvantPeremption <= 30;
  const stockProche = epi.seuilAlerte > 0 && epi.quantite <= Math.ceil(epi.seuilAlerte * 1.2);

  if (peremptionProche || stockProche || inspectionProche) return "BIENTOT";

  return "OK";
};

// Aplatit l'include `inspections` (tableau d'un seul élément) en un champ
// direct `derniereInspection`, plus lisible côté frontend qu'un tableau.
const avecDerniereInspection = (epi) => {
  const { inspections, ...reste } = epi;
  return { ...reste, derniereInspection: inspections?.[0]?.dateInspection ?? null };
};

// Annote un EPI (objet Prisma) avec sa dernière inspection puis son niveau d'alerte calculé
const avecNiveauAlerte = (epi) => {
  const epiAplati = epi.inspections !== undefined ? avecDerniereInspection(epi) : epi;
  return { ...epiAplati, niveauAlerte: calculerNiveauAlerte(epiAplati) };
};

// Convertit en objets Date les champs de date fournis en chaînes — nécessaire
// car Prisma 7 exige un DateTime ISO complet, pas une simple chaîne "AAAA-MM-JJ".
const normaliserDates = (data) => ({
  ...data,
  ...(data.datePeremption !== undefined && {
    datePeremption: data.datePeremption ? new Date(data.datePeremption) : null,
  }),
});

// Récupère tous les EPI (avec leur site, leur dernière inspection et leur niveau d'alerte calculé)
const getAllEpis = async () => {
  const epis = await prisma.epi.findMany({
    include: { site: { select: { id: true, nom: true } }, ...INCLUDE_DERNIERE_INSPECTION },
    orderBy: { createdAt: "desc" },
  });
  return epis.map(avecNiveauAlerte);
};

// Récupère un EPI par son id
const getEpiById = async (id) => {
  const epi = await prisma.epi.findUnique({
    where: { id },
    include: { site: true, ...INCLUDE_DERNIERE_INSPECTION },
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
      photoUrl: data.photoUrl || null,
      quantite: data.quantite,
      seuilAlerte: data.seuilAlerte,
      statut: data.statut,
      datePeremption: data.datePeremption ? new Date(data.datePeremption) : null,
      frequenceInspectionJours: data.frequenceInspectionJours || null,
      siteId: data.siteId,
    },
    include: { site: { select: { id: true, nom: true } }, ...INCLUDE_DERNIERE_INSPECTION },
  });
  return avecNiveauAlerte(epi);
};

// Met à jour un EPI
const updateEpi = async (id, data) => {
  const epi = await prisma.epi.update({
    where: { id },
    data: normaliserDates(data),
    include: { site: { select: { id: true, nom: true } }, ...INCLUDE_DERNIERE_INSPECTION },
  });
  return avecNiveauAlerte(epi);
};

// Supprime un EPI
const deleteEpi = async (id) => {
  return await prisma.epi.delete({
    where: { id },
  });
};

// EPI en alerte : stock critique, péremption, ou inspection en retard/proche
// (regroupe les niveaux ALERTE et BIENTOT calculés ci-dessus)
const getEpisEnAlerte = async () => {
  const epis = await prisma.epi.findMany({
    include: { site: { select: { nom: true } }, ...INCLUDE_DERNIERE_INSPECTION },
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
  calculerNiveauAlerte,
  avecNiveauAlerte,
  INCLUDE_DERNIERE_INSPECTION,
};
