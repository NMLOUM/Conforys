const actionService = require("../services/actionService");
const { handleErreur } = require("../utils/handleErreur");

// GET /api/actions — vue globale, QHSE/ADMIN, scopée par entreprise
const getAllActions = async (req, res) => {
  try {
    const { entrepriseId } = req.user;
    const { statut, priorite, responsableId } = req.query;
    const actions = await actionService.getAllActions(entrepriseId, { statut, priorite, responsableId });
    res.status(200).json({ success: true, data: actions });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/actions/mes-actions — actions assignées au connecté, tous rôles
const getMesActions = async (req, res) => {
  try {
    const actions = await actionService.getMesActions(req.user.userId);
    res.status(200).json({ success: true, data: actions });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/incidents/:id/actions
const getActionsByIncident = async (req, res) => {
  try {
    const actions = await actionService.getActionsByIncident(req.params.id);
    res.status(200).json({ success: true, data: actions });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/incidents/:id/actions
const createAction = async (req, res) => {
  try {
    const action = await actionService.createAction(req.params.id, req.body, req.user.userId);
    res.status(201).json({ success: true, data: action });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/actions/:id
const updateAction = async (req, res) => {
  try {
    const action = await actionService.updateAction(req.params.id, req.body);
    res.status(200).json({ success: true, data: action });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/actions/:id/cloturer
const cloturerAction = async (req, res) => {
  try {
    const action = await actionService.cloturerAction(
      req.params.id,
      req.body.commentaireCloture
    );
    res.status(200).json({ success: true, data: action });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/actions/:id/progresser — responsable uniquement (tous rôles), A_FAIRE → EN_COURS
const progresserAction = async (req, res) => {
  try {
    const action = await actionService.progresserAction(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: action });
  } catch (error) {
    handleErreur(res, error);
  }
};

// DELETE /api/actions/:id
const deleteAction = async (req, res) => {
  try {
    await actionService.deleteAction(req.params.id);
    res.status(200).json({ success: true, message: "Action supprimée." });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/audits/:id/actions
const getActionsByAudit = async (req, res) => {
  try {
    const actions = await actionService.getActionsByAudit(req.params.id);
    res.status(200).json({ success: true, data: actions });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/audits/:id/generer-actions — QHSE uniquement
const genererActionsDepuisAudit = async (req, res) => {
  try {
    const actions = await actionService.genererActionsDepuisAudit(req.params.id);
    res.status(201).json({ success: true, data: actions });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = {
  getAllActions,
  getMesActions,
  getActionsByIncident,
  createAction,
  updateAction,
  cloturerAction,
  progresserAction,
  deleteAction,
  getActionsByAudit,
  genererActionsDepuisAudit,
};
