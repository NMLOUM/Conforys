// Journal complet des EPI : une entrée immuable par événement métier
// (création, modification, suppression, affectation, retour, inspection),
// même principe que historiqueService.js pour les incidents.
const prisma = require("../config/prisma");

// Crée une entrée dans le journal d'un EPI. Ne lève jamais d'erreur vers
// l'appelant — l'audit est complémentaire, jamais bloquant pour l'opération
// métier principale (même règle que enregistrer/enregistrerAction/enregistrerRisque).
const enregistrer = async (epiId, auteurId, action, details = null) => {
  try {
    return await prisma.historiqueEpi.create({
      data: { epiId, auteurId, action, details },
    });
  } catch (err) {
    console.error("[HISTORIQUE EPI] Échec enregistrement :", err.message);
  }
};

// HistoriqueEpi n'a pas de champ "type" dédié : chaque entrée est un libellé
// métier free-text. On dérive une catégorie à partir du préfixe du libellé —
// utilisée à la fois pour le filtre ?typeAction= et pour le badge côté client.
const CATEGORIES_ACTION = [
  { code: "CREATION",      where: { action: "EPI créé" },                 test: (a) => a === "EPI créé" },
  { code: "MODIFICATION",  where: { action: "EPI modifié" },              test: (a) => a === "EPI modifié" },
  { code: "SUPPRESSION",   where: { action: "EPI supprimé" },             test: (a) => a === "EPI supprimé" },
  { code: "AFFECTATION",   where: { action: "EPI affecté" },              test: (a) => a === "EPI affecté" },
  { code: "RETOUR",        where: { action: "EPI rendu" },                test: (a) => a === "EPI rendu" },
  { code: "INSPECTION",    where: { action: "Inspection enregistrée" },   test: (a) => a === "Inspection enregistrée" },
];

const deriverCategorie = (action) => CATEGORIES_ACTION.find((c) => c.test(action))?.code ?? "AUTRE";

// Journal global : toutes les entrées HistoriqueEpi des EPI de l'entreprise
// du demandeur (isolation multi-tenant, même principe que
// historiqueService.getHistoriqueGlobal), avec filtres optionnels et pagination.
const getHistoriqueGlobal = async (entrepriseId, { typeAction, auteurId, epiId, dateDebut, dateFin, page = 1, limit = 20 } = {}) => {
  const categorie = CATEGORIES_ACTION.find((c) => c.code === typeAction);

  const debut = dateDebut && !isNaN(new Date(dateDebut).getTime()) ? new Date(dateDebut) : null;
  const fin   = dateFin   && !isNaN(new Date(dateFin).getTime())   ? new Date(dateFin)   : null;
  if (fin) fin.setHours(23, 59, 59, 999);

  const where = {
    epi: { site: { entrepriseId } },
    ...(auteurId && { auteurId }),
    ...(epiId    && { epiId }),
    ...(categorie && categorie.where),
    ...((debut || fin) && {
      dateAction: {
        ...(debut && { gte: debut }),
        ...(fin   && { lte: fin }),
      },
    }),
  };

  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const skip = (pageNum - 1) * limitNum;

  const [entries, total] = await Promise.all([
    prisma.historiqueEpi.findMany({
      where,
      include: {
        auteur: { select: { id: true, nom: true, prenom: true } },
        epi:    { select: { id: true, designation: true } },
      },
      orderBy: { dateAction: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.historiqueEpi.count({ where }),
  ]);

  return {
    data: entries.map((e) => ({ ...e, categorie: deriverCategorie(e.action) })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

module.exports = { enregistrer, getHistoriqueGlobal };
