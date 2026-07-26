const analyseCausesService = require("../services/analyseCausesService");
const { handleErreur } = require("../utils/handleErreur");

// GET /api/incidents/:id/analyse — lecture seule, tous les rôles ayant accès à l'incident
const getAnalyse = async (req, res) => {
  try {
    const analyse = await analyseCausesService.getAnalyse(req.params.id, req.user.entrepriseId);
    res.status(200).json({ success: true, data: analyse });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/incidents/:id/analyse — initialise l'analyse (RESPONSABLE_QHSE)
const initialiserAnalyse = async (req, res) => {
  try {
    const analyse = await analyseCausesService.initialiserAnalyse(req.params.id, req.user.userId, req.user.entrepriseId);
    res.status(201).json({ success: true, data: analyse });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/incidents/:id/analyse — met à jour l'analyse (RESPONSABLE_QHSE)
const updateAnalyse = async (req, res) => {
  try {
    const analyse = await analyseCausesService.updateAnalyse(req.params.id, req.body, req.user.entrepriseId);
    res.status(200).json({ success: true, data: analyse });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/incidents/:id/analyse/action — génère une action corrective depuis la cause racine (RESPONSABLE_QHSE)
const genererActionDepuisAnalyse = async (req, res) => {
  try {
    const action = await analyseCausesService.genererActionDepuisAnalyse(req.params.id, req.user.entrepriseId);
    res.status(201).json({ success: true, data: action });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getAnalyse, initialiserAnalyse, updateAnalyse, genererActionDepuisAnalyse };
