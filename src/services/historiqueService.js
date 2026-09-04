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
// Scopé à l'entreprise du demandeur (isolation multi-tenant) — renvoie un
// tableau vide si l'incident n'existe pas ou appartient à une autre entreprise
// (le contrôleur vérifie séparément l'existence de l'incident pour un 404 propre).
// Inclut nom/prénom de l'auteur pour l'affichage côté client.
const getHistoriqueByIncident = async (incidentId, entrepriseId) => {
  return await prisma.historiqueIncident.findMany({
    where:   { incidentId, incident: { declarePar: { entrepriseId } } },
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

// Catégories dérivées des libellés HistoriqueRisque — réutilise les codes de
// badge déjà existants côté client (CREATION/MODIFICATION/ACTION_CORRECTIVE/AUTRE).
const CATEGORIES_RISQUE = [
  { code: "CREATION",          where: { action: "Risque identifié" },                        test: (a) => a === "Risque identifié" },
  { code: "ACTION_CORRECTIVE", where: { action: { startsWith: "Action de prévention" } },     test: (a) => a.startsWith("Action de prévention") },
  { code: "MODIFICATION",      where: { OR: [{ action: { startsWith: "Cotation modifiée" } }, { action: { startsWith: "Mesures de prévention" } }] },
    test: (a) => a.startsWith("Cotation modifiée") || a.startsWith("Mesures de prévention") },
];
const deriverCategorieRisque = (action) => CATEGORIES_RISQUE.find((c) => c.test(action))?.code ?? "AUTRE";

// Journal global DUERP : toutes les entrées HistoriqueRisque des risques de
// l'entreprise du demandeur, avec filtres optionnels et pagination — même
// principe que getHistoriqueGlobal (incidents) / getHistoriqueGlobal (EPI).
const getHistoriqueGlobalRisque = async (entrepriseId, { typeAction, auteurId, risqueId, dateDebut, dateFin, page = 1, limit = 20 } = {}) => {
  const categorie = CATEGORIES_RISQUE.find((c) => c.code === typeAction);

  const debut = dateDebut && !isNaN(new Date(dateDebut).getTime()) ? new Date(dateDebut) : null;
  const fin   = dateFin   && !isNaN(new Date(dateFin).getTime())   ? new Date(dateFin)   : null;
  if (fin) fin.setHours(23, 59, 59, 999);

  const where = {
    risque: { site: { entrepriseId } },
    ...(auteurId  && { auteurId }),
    ...(risqueId  && { risqueId }),
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
    prisma.historiqueRisque.findMany({
      where,
      include: {
        auteur: { select: { id: true, nom: true, prenom: true } },
        risque: { select: { id: true, danger: true } },
      },
      orderBy: { dateAction: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.historiqueRisque.count({ where }),
  ]);

  return {
    data: entries.map((e) => ({ ...e, categorie: deriverCategorieRisque(e.action) })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
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

// ── Piste d'audit d'une action corrective (CAPA) ────────────────────────────
//
// Même principe que l'historique des incidents/risques : une entrée immuable
// par événement (création, changement de statut, étape complétée, clôture).
const enregistrerAction = async (actionId, auteurId, action, details = null) => {
  try {
    return await prisma.historiqueAction.create({
      data: { actionCorrectiveId: actionId, auteurId, action, details },
    });
  } catch (err) {
    console.error("[HISTORIQUE ACTION] Échec enregistrement :", err.message);
  }
};

const getHistoriqueByAction = async (actionId) => {
  return await prisma.historiqueAction.findMany({
    where:   { actionCorrectiveId: actionId },
    include: { auteur: { select: { id: true, nom: true, prenom: true } } },
    orderBy: { dateAction: "desc" },
  });
};

// Catégories dérivées des libellés HistoriqueAction.
const CATEGORIES_ACTION_CAPA = [
  { code: "CREATION",          where: { action: "Action créée" },                     test: (a) => a === "Action créée" },
  { code: "CHANGEMENT_STATUT", where: { OR: [{ action: { startsWith: "Statut changé" } }, { action: "Action clôturée" }] },
    test: (a) => a.startsWith("Statut changé") || a === "Action clôturée" },
  { code: "MODIFICATION",      where: { action: "Action modifiée" },                  test: (a) => a === "Action modifiée" },
  { code: "ETAPE",              where: { action: { startsWith: "Étape" } },            test: (a) => a.startsWith("Étape") },
  { code: "PIECE_JOINTE",      where: { action: { startsWith: "Pièce jointe" } },     test: (a) => a.startsWith("Pièce jointe") },
];
const deriverCategorieAction = (action) => CATEGORIES_ACTION_CAPA.find((c) => c.test(action))?.code ?? "AUTRE";

// Journal global CAPA : toutes les entrées HistoriqueAction des actions
// correctives de l'entreprise du demandeur (une action vient d'un incident,
// d'un audit OU d'un risque — jamais deux à la fois, même OR que getAllActions).
const getHistoriqueGlobalAction = async (entrepriseId, { typeAction, auteurId, actionId, dateDebut, dateFin, page = 1, limit = 20 } = {}) => {
  const categorie = CATEGORIES_ACTION_CAPA.find((c) => c.code === typeAction);

  const debut = dateDebut && !isNaN(new Date(dateDebut).getTime()) ? new Date(dateDebut) : null;
  const fin   = dateFin   && !isNaN(new Date(dateFin).getTime())   ? new Date(dateFin)   : null;
  if (fin) fin.setHours(23, 59, 59, 999);

  const where = {
    actionCorrective: {
      OR: [
        { incident: { declarePar: { entrepriseId } } },
        { audit: { site: { entrepriseId } } },
        { risque: { site: { entrepriseId } } },
      ],
    },
    ...(auteurId          && { auteurId }),
    ...(actionId           && { actionCorrectiveId: actionId }),
    ...(categorie          && categorie.where),
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
    prisma.historiqueAction.findMany({
      where,
      include: {
        auteur:           { select: { id: true, nom: true, prenom: true } },
        actionCorrective: { select: { id: true, description: true } },
      },
      orderBy: { dateAction: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.historiqueAction.count({ where }),
  ]);

  return {
    data: entries.map((e) => ({ ...e, categorie: deriverCategorieAction(e.action) })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

// ── Piste d'audit d'un audit interne ────────────────────────────────────────
//
// Même principe que les autres modules : une entrée immuable par événement
// (création, démarrage, réponse à une question, finalisation, plan d'actions généré).
const enregistrerAudit = async (auditId, auteurId, action, details = null) => {
  try {
    return await prisma.historiqueAudit.create({
      data: { auditId, auteurId, action, details },
    });
  } catch (err) {
    console.error("[HISTORIQUE AUDIT] Échec enregistrement :", err.message);
  }
};

const getHistoriqueByAudit = async (auditId) => {
  return await prisma.historiqueAudit.findMany({
    where:   { auditId },
    include: { auteur: { select: { id: true, nom: true, prenom: true } } },
    orderBy: { dateAction: "desc" },
  });
};

// Catégories dérivées des libellés HistoriqueAudit — NON_CONFORME réutilise
// le badge déjà défini pour les résultats d'inspection EPI (rouge).
const CATEGORIES_AUDIT = [
  { code: "CREATION",          where: { action: "Audit créé" },                          test: (a) => a === "Audit créé" },
  { code: "CHANGEMENT_STATUT", where: { action: { startsWith: "Statut changé" } },        test: (a) => a.startsWith("Statut changé") },
  { code: "NON_CONFORME",      where: { action: "Non-conformité enregistrée" },           test: (a) => a === "Non-conformité enregistrée" },
  { code: "ACTION_CORRECTIVE", where: { action: { startsWith: "Plan d'actions" } },       test: (a) => a.startsWith("Plan d'actions") },
];
const deriverCategorieAudit = (action) => CATEGORIES_AUDIT.find((c) => c.test(action))?.code ?? "AUTRE";

// Journal global Audits : toutes les entrées HistoriqueAudit des audits de
// l'entreprise du demandeur, avec filtres optionnels et pagination.
const getHistoriqueGlobalAudit = async (entrepriseId, { typeAction, auteurId, auditId, dateDebut, dateFin, page = 1, limit = 20 } = {}) => {
  const categorie = CATEGORIES_AUDIT.find((c) => c.code === typeAction);

  const debut = dateDebut && !isNaN(new Date(dateDebut).getTime()) ? new Date(dateDebut) : null;
  const fin   = dateFin   && !isNaN(new Date(dateFin).getTime())   ? new Date(dateFin)   : null;
  if (fin) fin.setHours(23, 59, 59, 999);

  const where = {
    audit: { site: { entrepriseId } },
    ...(auteurId  && { auteurId }),
    ...(auditId   && { auditId }),
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
    prisma.historiqueAudit.findMany({
      where,
      include: {
        auteur: { select: { id: true, nom: true, prenom: true } },
        audit:  { select: { id: true, reference: true } },
      },
      orderBy: { dateAction: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.historiqueAudit.count({ where }),
  ]);

  return {
    data: entries.map((e) => ({ ...e, categorie: deriverCategorieAudit(e.action) })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

// ── Piste d'audit d'une session de formation ────────────────────────────────
//
// Même principe : une entrée immuable par événement (création, démarrage,
// présence marquée, participant validé, terminée, annulée).
const enregistrerFormation = async (formationId, auteurId, action, details = null) => {
  try {
    return await prisma.historiqueFormation.create({
      data: { formationId, auteurId, action, details },
    });
  } catch (err) {
    console.error("[HISTORIQUE FORMATION] Échec enregistrement :", err.message);
  }
};

const getHistoriqueByFormation = async (formationId) => {
  return await prisma.historiqueFormation.findMany({
    where:   { formationId },
    include: { auteur: { select: { id: true, nom: true, prenom: true } } },
    orderBy: { dateAction: "desc" },
  });
};

// Catégories dérivées des libellés HistoriqueFormation — VALIDE réutilise le
// badge déjà défini pour les habilitations (vert).
const CATEGORIES_FORMATION = [
  { code: "CREATION",          where: { action: "Session créée" },                    test: (a) => a === "Session créée" },
  { code: "MODIFICATION",      where: { action: "Session modifiée" },                 test: (a) => a === "Session modifiée" },
  { code: "CHANGEMENT_STATUT", where: { action: { startsWith: "Statut changé" } },    test: (a) => a.startsWith("Statut changé") },
  { code: "VALIDE",            where: { action: { startsWith: "Participant validé" } }, test: (a) => a.startsWith("Participant validé") },
];
const deriverCategorieFormation = (action) => CATEGORIES_FORMATION.find((c) => c.test(action))?.code ?? "AUTRE";

// Journal global Formations : toutes les entrées HistoriqueFormation des
// sessions de l'entreprise du demandeur, avec filtres optionnels et pagination.
const getHistoriqueGlobalFormation = async (entrepriseId, { typeAction, auteurId, formationId, dateDebut, dateFin, page = 1, limit = 20 } = {}) => {
  const categorie = CATEGORIES_FORMATION.find((c) => c.code === typeAction);

  const debut = dateDebut && !isNaN(new Date(dateDebut).getTime()) ? new Date(dateDebut) : null;
  const fin   = dateFin   && !isNaN(new Date(dateFin).getTime())   ? new Date(dateFin)   : null;
  if (fin) fin.setHours(23, 59, 59, 999);

  const where = {
    formation: { site: { entrepriseId } },
    ...(auteurId    && { auteurId }),
    ...(formationId && { formationId }),
    ...(categorie   && categorie.where),
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
    prisma.historiqueFormation.findMany({
      where,
      include: {
        auteur:    { select: { id: true, nom: true, prenom: true } },
        formation: { select: { id: true, titre: true } },
      },
      orderBy: { dateAction: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.historiqueFormation.count({ where }),
  ]);

  return {
    data: entries.map((e) => ({ ...e, categorie: deriverCategorieFormation(e.action) })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

module.exports = {
  enregistrer, getHistoriqueByIncident, getHistoriqueGlobal,
  enregistrerRisque, getHistoriqueByRisque, getHistoriqueGlobalRisque,
  enregistrerAction, getHistoriqueByAction, getHistoriqueGlobalAction,
  enregistrerAudit, getHistoriqueByAudit, getHistoriqueGlobalAudit,
  enregistrerFormation, getHistoriqueByFormation, getHistoriqueGlobalFormation,
};
