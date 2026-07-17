// Importation de l'instance Prisma partagée (connexion à la base)
const prisma = require("../config/prisma");
const { TEMPLATES_AUDIT, getTemplateById } = require("../config/auditTemplates");

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

// Récupère tous les audits (avec auditeur et site)
const getAllAudits = async () => {
  return await prisma.audit.findMany({
    include: {
      auditeur: { select: { id: true, nom: true, prenom: true } },
      site: { select: { id: true, nom: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

// Récupère un audit par son id, avec ses questions de checklist
const getAuditById = async (id) => {
  return await prisma.audit.findUnique({
    where: { id },
    include: {
      auditeur: { select: { id: true, nom: true, prenom: true } },
      site: true,
      questions: { orderBy: { createdAt: "asc" } },
    },
  });
};

// Crée un nouvel audit à partir d'un template : l'audit et ses questions
// de checklist sont créés dans la même transaction, avec la même référence
// atomique que pour les incidents (cohérence garantie même en cas d'erreur).
const createAudit = async (data) => {
  const template = getTemplateById(data.templateId);
  if (!template) {
    throw new ErreurMetier("Template d'audit introuvable.");
  }

  const reference = await genererReference();

  return await prisma.$transaction(async (tx) => {
    const audit = await tx.audit.create({
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
      data: template.questions.map((q) => ({
        libelle: q.libelle,
        criticite: q.criticite,
        auditId: audit.id,
      })),
    });

    return await tx.audit.findUnique({
      where: { id: audit.id },
      include: {
        auditeur: { select: { id: true, nom: true, prenom: true } },
        site: true,
        questions: { orderBy: { createdAt: "asc" } },
      },
    });
  });
};

// Met à jour un audit
const updateAudit = async (id, data) => {
  return await prisma.audit.update({
    where: { id },
    data,
  });
};

// Supprime un audit (les questions sont supprimées en cascade)
const deleteAudit = async (id) => {
  return await prisma.audit.delete({
    where: { id },
  });
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

// Enregistre la réponse à une question et recalcule le score de l'audit
const repondreQuestion = async (auditId, questionId, data) => {
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

  return await getAuditById(auditId);
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
};
