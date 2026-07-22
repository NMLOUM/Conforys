const moduleFormationService = require("../services/moduleFormationService");
const { handleErreur } = require("../utils/handleErreur");

// GET /api/modules — liste des modules en ligne
const getAllModules = async (req, res) => {
  try {
    const modules = await moduleFormationService.getAllModules(req.user.userId);
    res.status(200).json({ success: true, data: modules });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/modules/:id — module avec ses leçons et son quiz
const getModuleById = async (req, res) => {
  try {
    const module = await moduleFormationService.getModuleById(req.params.id, req.user.userId);
    if (!module) {
      return res.status(404).json({ success: false, message: "Module introuvable." });
    }
    res.status(200).json({ success: true, data: module });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/modules/:id/lecons/:leconId/completer
const completerLecon = async (req, res) => {
  try {
    const progression = await moduleFormationService.completerLecon(
      req.params.id, req.params.leconId, req.user.userId
    );
    res.status(200).json({ success: true, data: progression });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/modules/:id/quiz/soumettre
const soumettreQuiz = async (req, res) => {
  try {
    const progression = await moduleFormationService.soumettreQuiz(
      req.params.id, req.user.userId, req.body.reponses
    );
    res.status(200).json({ success: true, data: progression });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/modules/:id/ma-progression
const getMaProgression = async (req, res) => {
  try {
    const progression = await moduleFormationService.getMaProgression(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: progression });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getAllModules, getModuleById, completerLecon, soumettreQuiz, getMaProgression };
