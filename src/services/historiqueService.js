const prisma = require("../config/prisma");

// Crée une entrée immuable dans la piste d'audit d'un incident.
// Ne lève pas d'erreur vers l'appelant — l'audit ne doit jamais bloquer l'opération principale.
const enregistrer = async (incidentId, auteurId, action, details = null) => {
  try {
    return await prisma.historiqueIncident.create({
      data: { incidentId, auteurId, action, details },
    });
  } catch (err) {
    // On logue sans propager : la piste d'audit est complémentaire, pas critique
    console.error("[HISTORIQUE] Échec enregistrement :", err.message);
  }
};

// Retourne l'historique complet d'un incident, du plus récent au plus ancien.
// Inclut nom/prénom de l'auteur pour l'affichage côté client.
const getHistoriqueByIncident = async (incidentId) => {
  return await prisma.historiqueIncident.findMany({
    where:   { incidentId },
    include: { auteur: { select: { id: true, nom: true, prenom: true } } },
    orderBy: { dateAction: "desc" },
  });
};

// ── Piste d'audit DUERP ──────────────────────────────────────────────────────
//
// Même principe que l'historique des incidents : une entrée immuable par
// changement (création, cotation, mesures, génération d'action), nécessaire à
// la traçabilité des versions successives du DUERP exigée par le Code du travail.
const enregistrerRisque = async (risqueId, auteurId, action, details = null) => {
  try {
    return await prisma.historiqueRisque.create({
      data: { risqueId, auteurId, action, details },
    });
  } catch (err) {
    console.error("[HISTORIQUE RISQUE] Échec enregistrement :", err.message);
  }
};

const getHistoriqueByRisque = async (risqueId) => {
  return await prisma.historiqueRisque.findMany({
    where:   { risqueId },
    include: { auteur: { select: { id: true, nom: true, prenom: true } } },
    orderBy: { dateAction: "desc" },
  });
};

// ── Journal d'activité global ────────────────────────────────────────────────
//
// HistoriqueIncident n'a pas de champ "type" dédié : chaque entrée est un
// libellé métier free-text ("Incident déclaré", "Statut changé : X → Y",
// "Action corrective ajoutée", "Photo ajoutée"). On dérive une catégorie à
// partir du préfixe du libellé — utilisée à la fois pour le filtre
// ?typeAction= (traduit en clause Prisma) et pour le badge coloré côté client.
const CATEGORIES_ACTION = [
  { code: "DECLARATION",       where: { action: "Incident déclaré" },                   test: (a) => a === "Incident déclaré" },
  { code: "CHANGEMENT_STATUT", where: { action: { startsWith: "Statut changé" } },       test: (a) => a.startsWith("Statut changé") },
  { code: "ACTION_CORRECTIVE", where: { action: { startsWith: "Action corrective" } },   test: (a) => a.startsWith("Action corrective") },
  { code: "PIECE_JOINTE",      where: { action: { contains: "Photo" } },                 test: (a) => a.includes("Photo") },
];

const deriverCategorie = (action) => CATEGORIES_ACTION.find((c) => c.test(action))?.code ?? "AUTRE";

// Journal d'activité global : toutes les entrées HistoriqueIncident de tous
// les incidents de l'entreprise du demandeur (isolation multi-tenant, même
// principe que getAllIncidents/getAllActions), avec filtres optionnels et
// pagination. Chaque entrée renvoyée est annotée d'une "categorie" dérivée
// pour l'affichage (badge) côté client.
const getHistoriqueGlobal = async (entrepriseId, { typeAction, auteurId, incidentId, dateDebut, dateFin, page = 1, limit = 20 } = {}) => {
  const categorie = CATEGORIES_ACTION.find((c) => c.code === typeAction);

  const debut = dateDebut && !isNaN(new Date(dateDebut).getTime()) ? new Date(dateDebut) : null;
  const fin   = dateFin   && !isNaN(new Date(dateFin).getTime())   ? new Date(dateFin)   : null;
  if (fin) fin.setHours(23, 59, 59, 999); // inclut toute la journée de fin de période

  const where = {
    incident: { declarePar: { entrepriseId } },
    ...(auteurId   && { auteurId }),
    ...(incidentId && { incidentId }),
    ...(categorie  && categorie.where),
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
    prisma.historiqueIncident.findMany({
      where,
      include: {
        auteur:   { select: { id: true, nom: true, prenom: true } },
        incident: { select: { id: true, numeroReference: true } },
      },
      orderBy: { dateAction: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.historiqueIncident.count({ where }),
  ]);

  return {
    data: entries.map((e) => ({ ...e, categorie: deriverCategorie(e.action) })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

module.exports = { enregistrer, getHistoriqueByIncident, getHistoriqueGlobal, enregistrerRisque, getHistoriqueByRisque };
