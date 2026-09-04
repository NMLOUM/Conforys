// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");
const { TEMPLATES_AUDIT, getTemplateById } = require("../config/auditTemplates");
const { enregistrerAudit, getHistoriqueByAudit: getHistoriqueAudit } = require("./historiqueService");

// Erreur métier avec code HTTP (400/404) — évite de renvoyer 500 sur des cas attendus
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Poids de chaque niveau de criticité dans le calcul du score pondéré
const POIDS_CRITICITE = { CRITIQUE: 3, MAJEUR: 2, MINEUR: 1 };

// Génère une référence unique : AUD-2026-0001
const genererReference = async () => {
  const annee = new Date().getFullYear();
  const count = await prisma.audit.count();
  const numero = String(count + 1).padStart(4, "0");
  return `AUD-${annee}-${numero}`;
};

// Liste des templates disponibles (sans les questions, juste pour les cartes de sélection)
const getTemplates = () => {
  return TEMPLATES_AUDIT.map(({ id, nom, description, type, questions }) => ({
    id, nom, description, type,
    nombreQuestions: questions.length,
  }));
};

// Récupère tous les audits (avec auditeur et site) — scopés à l'entreprise du demandeur
const getAllAudits = async (entrepriseId) => {
  return await prisma.audit.findMany({
    where: { site: { entrepriseId } },
    include: {
      auditeur: { select: { id: true, nom: true, prenom: true } },
      site: { select: { id: true, nom: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

// Récupère un audit par son id, avec ses questions de checklist — renvoie
// null si l'audit n'existe pas ou appartient à une autre entreprise (pour ne
// pas distinguer les deux cas côté API).
const getAuditById = async (id, entrepriseId) => {
  return await prisma.audit.findFirst({
    where: { id, site: { entrepriseId } },
    include: {
      auditeur: { select: { id: true, nom: true, prenom: true } },
      site: true,
      questions: { orderBy: { ordre: "asc" } },
    },
  });
};

// Vérifie que le site visé appartient bien à l'entreprise du demandeur —
// empêche de créer un audit sur le site d'une autre entreprise en
// connaissant/devinant son id.
const verifierSite = async (siteId, entrepriseId) => {
  const site = await prisma.site.findFirst({ where: { id: siteId, entrepriseId } });
  if (!site) throw new ErreurMetier("Site introuvable.", 404);
};

// Crée un nouvel audit à partir d'un template : l'audit et ses questions
// de checklist sont créés dans la même transaction, avec la même référence
// atomique que pour les incidents (cohérence garantie même en cas d'erreur).
const createAudit = async (data, userId, entrepriseId) => {
  const template = getTemplateById(data.templateId);
  if (!template) {
    throw new ErreurMetier("Template d'audit introuvable.");
  }
  await verifierSite(data.siteId, entrepriseId);

  const reference = await genererReference();

  const audit = await prisma.$transaction(async (tx) => {
    const cree = await tx.audit.create({
      data: {
        reference,
        titre: data.titre,
        type: template.type,
        statut: "PLANIFIE",
        datePrevue: new Date(data.datePrevue),
        auditeurId: data.auditeurId,
        siteId: data.siteId,
      },
    });

    await tx.questionAudit.createMany({
      data: template.questions.map((q, index) => ({
        libelle: q.libelle,
        criticite: q.criticite,
        auditId: cree.id,
        ordre: index,
      })),
    });

    return await tx.audit.findUnique({
      where: { id: cree.id },
      include: {
        auditeur: { select: { id: true, nom: true, prenom: true } },
        site: true,
        questions: { orderBy: { ordre: "asc" } },
      },
    });
  });

  await enregistrerAudit(audit.id, userId, "Audit créé", `Référence : ${audit.reference} · Template : ${template.nom}`);
  return audit;
};

// Vérifie qu'un audit appartient à l'entreprise du demandeur avant toute
// écriture (modification, suppression, transition de statut) — sans ce
// contrôle, n'importe quel utilisateur connaissant l'id d'un audit d'une
// autre entreprise pourrait le modifier/supprimer/clôturer.
const verifierAppartenanceAudit = async (id, entrepriseId) => {
  const audit = await prisma.audit.findFirst({ where: { id, site: { entrepriseId } } });
  if (!audit) throw new ErreurMetier("Audit introuvable.", 404);
  return audit;
};

// Met à jour un audit
const updateAudit = async (id, data, entrepriseId) => {
  await verifierAppartenanceAudit(id, entrepriseId);
  return await prisma.audit.update({
    where: { id },
    data,
  });
};

// Supprime un audit (les questions sont supprimées en cascade)
const deleteAudit = async (id, entrepriseId) => {
  await verifierAppartenanceAudit(id, entrepriseId);
  return await prisma.audit.delete({
    where: { id },
  });
};

// Include partagé pour les réponses des transitions de statut
const INCLUDE_AUDIT = {
  auditeur: { select: { id: true, nom: true, prenom: true } },
  site: true,
  questions: { orderBy: { ordre: "asc" } },
};

// ── Workflow de statuts ────────────────────────────────────────────────────────

// PLANIFIE → EN_COURS : démarre la réalisation de l'audit sur le terrain
const demarrer = async (id, userId, entrepriseId) => {
  const audit = await verifierAppartenanceAudit(id, entrepriseId);
  if (audit.statut !== "PLANIFIE") {
    throw new ErreurMetier(
      `Impossible de démarrer un audit en statut "${audit.statut}". Statut attendu : PLANIFIE.`
    );
  }

  const resultat = await prisma.audit.update({
    where: { id },
    data: { statut: "EN_COURS" },
    include: INCLUDE_AUDIT,
  });
  await enregistrerAudit(id, userId, "Statut changé : PLANIFIE → EN_COURS");
  return resultat;
};

// EN_COURS → TERMINE : clôture l'audit après vérification que toutes les
// questions ont reçu une réponse. Le score (déjà tenu à jour à chaque
// réponse) est conservé tel quel — c'est la valeur finale figée.
const finaliser = async (id, userId, entrepriseId) => {
  await verifierAppartenanceAudit(id, entrepriseId);
  const audit = await prisma.audit.findUnique({
    where: { id },
    include: { questions: true },
  });
  if (audit.statut !== "EN_COURS") {
    throw new ErreurMetier(
      `Impossible de finaliser un audit en statut "${audit.statut}". Statut attendu : EN_COURS.`
    );
  }

  const nonRepondues = audit.questions.filter((q) => q.reponse === "NON_REPONDU").length;
  if (nonRepondues > 0) {
    throw new ErreurMetier(
      `Impossible de finaliser : ${nonRepondues} question(s) sans réponse. Répondez à toute la checklist avant de finaliser.`
    );
  }

  const resultat = await prisma.audit.update({
    where: { id },
    data: { statut: "TERMINE", dateRealisee: new Date() },
    include: INCLUDE_AUDIT,
  });
  await enregistrerAudit(id, userId, "Statut changé : EN_COURS → TERMINE", `Score de conformité : ${audit.scoreConformite ?? 0}%`);
  return resultat;
};

// * → ANNULE (sauf audit déjà terminé ou déjà annulé)
const annuler = async (id, userId, entrepriseId) => {
  const audit = await verifierAppartenanceAudit(id, entrepriseId);
  if (audit.statut === "TERMINE") {
    throw new ErreurMetier("Impossible d'annuler un audit déjà terminé.");
  }
  if (audit.statut === "ANNULE") {
    throw new ErreurMetier("Cet audit est déjà annulé.");
  }

  const resultat = await prisma.audit.update({
    where: { id },
    data: { statut: "ANNULE" },
    include: INCLUDE_AUDIT,
  });
  await enregistrerAudit(id, userId, `Statut changé : ${audit.statut} → ANNULE`);
  return resultat;
};

// ── Scoring pondéré ───────────────────────────────────────────────────────────
//
// Chaque question compte pour un nombre de points égal au poids de sa criticité
// (CRITIQUE = 3, MAJEUR = 2, MINEUR = 1). Le score de conformité est le rapport
// entre les points obtenus (questions CONFORME) et les points possibles.
// Seule NON_APPLICABLE est exclue du dénominateur (elle ne renseigne aucune
// conformité) ; NON_REPONDU compte comme un point non obtenu (0), pour que le
// score reflète une vraie progression pendant l'audit — sinon les questions
// non traitées seraient exclues du calcul et une seule réponse "Conforme"
// ferait immédiatement afficher 100 %.
const calculerScore = async (auditId) => {
  const questions = await prisma.questionAudit.findMany({ where: { auditId } });

  let pointsObtenus = 0;
  let pointsPossibles = 0;

  for (const q of questions) {
    if (q.reponse === "NON_APPLICABLE") continue;
    const poids = POIDS_CRITICITE[q.criticite];
    pointsPossibles += poids;
    if (q.reponse === "CONFORME") pointsObtenus += poids;
  }

  const score = pointsPossibles === 0 ? 0 : Math.round((pointsObtenus / pointsPossibles) * 100);

  await prisma.audit.update({
    where: { id: auditId },
    data: { scoreConformite: score },
  });

  return score;
};

// Historique des scores des audits terminés, pour tracer leur évolution dans
// le temps (courbe). Filtres optionnels par site et par type.
const getHistoriqueScores = async (entrepriseId, { siteId, type } = {}) => {
  const where = {
    site: { entrepriseId },
    statut: "TERMINE",
    scoreConformite: { not: null },
    ...(siteId && { siteId }),
    ...(type && { type }),
  };

  const audits = await prisma.audit.findMany({
    where,
    select: {
      id: true,
      reference: true,
      type: true,
      scoreConformite: true,
      dateRealisee: true,
      datePrevue: true,
      site: { select: { id: true, nom: true } },
    },
    orderBy: [{ dateRealisee: "asc" }, { datePrevue: "asc" }],
  });

  return audits.map((a) => ({
    id: a.id,
    reference: a.reference,
    type: a.type,
    score: a.scoreConformite,
    date: a.dateRealisee ?? a.datePrevue,
    site: a.site,
  }));
};

// Enregistre la réponse à une question et recalcule le score de l'audit.
// Réservé aux audits EN_COURS : un audit PLANIFIE n'a pas encore démarré,
// et un audit TERMINE/ANNULE est figé en lecture seule.
const repondreQuestion = async (auditId, questionId, data, userId, entrepriseId) => {
  const audit = await verifierAppartenanceAudit(auditId, entrepriseId);
  if (audit.statut !== "EN_COURS") {
    throw new ErreurMetier(
      `Impossible de répondre : l'audit doit être « En cours » (statut actuel : "${audit.statut}").`
    );
  }

  const question = await prisma.questionAudit.findUnique({ where: { id: questionId } });
  if (!question || question.auditId !== auditId) {
    throw new ErreurMetier("Question introuvable pour cet audit.", 404);
  }

  await prisma.questionAudit.update({
    where: { id: questionId },
    data: {
      reponse: data.reponse,
      commentaire: data.commentaire?.trim() || null,
      photoUrl: data.photoUrl || null,
    },
  });

  await calculerScore(auditId);

  // Seules les non-conformités sont journalisées individuellement — répondre
  // "Conforme"/"N.A." à chaque question de la checklist noierait l'historique
  // sous des entrées de routine sans valeur pour la piste d'audit.
  if (data.reponse === "NON_CONFORME") {
    await enregistrerAudit(auditId, userId, "Non-conformité enregistrée", question.libelle.slice(0, 160));
  }

  return await getAuditById(auditId, entrepriseId);
};

// Historique d'un audit — vérifie d'abord qu'il appartient à l'entreprise du
// demandeur (même garde-fou que pour le DUERP : l'id seul ne doit pas suffire
// à consulter la piste d'audit d'un audit d'une autre entreprise).
const getHistoriqueByAudit = async (id, entrepriseId) => {
  await verifierAppartenanceAudit(id, entrepriseId);
  return getHistoriqueAudit(id);
};

// Export de toutes les fonctions du service
module.exports = {
  getTemplates,
  getAllAudits,
  getAuditById,
  createAudit,
  updateAudit,
  deleteAudit,
  calculerScore,
  repondreQuestion,
  getHistoriqueScores,
  demarrer,
  finaliser,
  annuler,
  getHistoriqueByAudit,
};
