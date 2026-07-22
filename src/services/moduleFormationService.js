// Formation en ligne (mini-LMS) : modules composés de leçons texte à lire
// séquentiellement, puis d'un quiz de validation. Complète les sessions
// présentielles du sous-bloc A avec un mode d'auto-apprentissage.
const prisma = require("../config/prisma");

// Erreur métier avec code HTTP — cohérent avec les autres services
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Valeurs par défaut d'une progression pas encore commencée (aucune ligne
// ProgressionModule en base tant que l'utilisateur n'a rien complété)
const PROGRESSION_VIERGE = { leconsCompletees: 0, scoreQuiz: null, valide: false, dateValidation: null };

// Liste tous les modules, annotés de la progression de l'utilisateur connecté
const getAllModules = async (userId) => {
  const modules = await prisma.moduleFormation.findMany({
    include: {
      _count: { select: { lecons: true } },
      progressions: { where: { userId }, select: { leconsCompletees: true, valide: true, scoreQuiz: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return modules.map(({ progressions, _count, ...reste }) => ({
    ...reste,
    nombreLecons: _count.lecons,
    progression: progressions[0]
      ? { leconsCompletees: progressions[0].leconsCompletees, valide: progressions[0].valide, scoreQuiz: progressions[0].scoreQuiz }
      : { leconsCompletees: 0, valide: false, scoreQuiz: null },
  }));
};

// Récupère un module avec ses leçons ordonnées et son quiz — les réponses ne
// portent jamais `estCorrecte` ici pour ne pas révéler la solution avant
// soumission du quiz.
const getModuleById = async (id, userId) => {
  const module = await prisma.moduleFormation.findUnique({
    where: { id },
    include: {
      lecons: { orderBy: { ordre: "asc" } },
      questions: {
        orderBy: { ordre: "asc" },
        include: { reponses: { select: { id: true, texte: true } } },
      },
      progressions: { where: { userId } },
    },
  });
  if (!module) return null;

  const { progressions, ...reste } = module;
  return { ...reste, progression: progressions[0] ?? PROGRESSION_VIERGE };
};

// Marque une leçon comme terminée pour l'utilisateur connecté. Le
// déverrouillage est séquentiel : on ne peut compléter que la leçon
// directement après la dernière déjà validée (ordre = leconsCompletees + 1).
// Reconfirmer une leçon déjà complétée est un no-op (idempotent).
const completerLecon = async (moduleId, leconId, userId) => {
  const lecon = await prisma.lecon.findUnique({ where: { id: leconId } });
  if (!lecon || lecon.moduleId !== moduleId) {
    throw new ErreurMetier("Leçon introuvable.", 404);
  }

  const progression = await prisma.progressionModule.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: { userId, moduleId },
    update: {},
  });

  if (lecon.ordre <= progression.leconsCompletees) {
    return progression;
  }
  if (lecon.ordre !== progression.leconsCompletees + 1) {
    throw new ErreurMetier("Terminez d'abord les leçons précédentes.");
  }

  return await prisma.progressionModule.update({
    where: { userId_moduleId: { userId, moduleId } },
    data: { leconsCompletees: { increment: 1 } },
  });
};

// Corrige le quiz soumis par l'utilisateur : calcule le % de bonnes réponses
// et valide le module si le score atteint le seuil requis. Le quiz n'est
// accessible que si toutes les leçons ont été complétées.
const soumettreQuiz = async (moduleId, userId, reponsesSoumises) => {
  const module = await prisma.moduleFormation.findUnique({
    where: { id: moduleId },
    include: { lecons: true, questions: { include: { reponses: true } } },
  });
  if (!module) throw new ErreurMetier("Module introuvable.", 404);
  if (module.questions.length === 0) {
    throw new ErreurMetier("Ce module ne contient aucune question de quiz.");
  }

  const progression = await prisma.progressionModule.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: { userId, moduleId },
    update: {},
  });

  if (progression.leconsCompletees < module.lecons.length) {
    throw new ErreurMetier("Terminez toutes les leçons avant de passer le quiz.");
  }

  let bonnesReponses = 0;
  for (const question of module.questions) {
    const reponseChoisieId = reponsesSoumises.find((r) => r.questionId === question.id)?.reponseId;
    const bonneReponse = question.reponses.find((r) => r.estCorrecte);
    if (reponseChoisieId && bonneReponse && reponseChoisieId === bonneReponse.id) {
      bonnesReponses++;
    }
  }

  const score = Math.round((bonnesReponses / module.questions.length) * 100);
  const valide = score >= module.scoreMinimum;

  return await prisma.progressionModule.update({
    where: { userId_moduleId: { userId, moduleId } },
    data: {
      scoreQuiz: score,
      valide,
      dateValidation: valide ? new Date() : null,
    },
  });
};

// Progression brute de l'utilisateur connecté sur un module donné
const getMaProgression = async (moduleId, userId) => {
  const progression = await prisma.progressionModule.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
  });
  return progression ?? PROGRESSION_VIERGE;
};

module.exports = {
  getAllModules,
  getModuleById,
  completerLecon,
  soumettreQuiz,
  getMaProgression,
};
