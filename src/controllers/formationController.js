const formationService = require("../services/formationService");
const { handleErreur } = require("../utils/handleErreur");

// Récupère toutes les formations
const getAllFormations = async (req, res) => {
  try {
    const formations = await formationService.getAllFormations(req.user.entrepriseId);
    res.status(200).json({ success: true, data: formations });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Récupère une formation par son id
const getFormationById = async (req, res) => {
  try {
    const formation = await formationService.getFormationById(req.params.id, req.user.entrepriseId);
    if (!formation) {
      return res.status(404).json({ success: false, message: "Formation introuvable." });
    }
    res.status(200).json({ success: true, data: formation });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Crée une nouvelle formation
const createFormation = async (req, res) => {
  try {
    const formation = await formationService.createFormation(req.body, req.user.entrepriseId);
    res.status(201).json({ success: true, data: formation });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Met à jour une formation
const updateFormation = async (req, res) => {
  try {
    const formation = await formationService.updateFormation(req.params.id, req.body, req.user.entrepriseId);
    res.status(200).json({ success: true, data: formation });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Formation introuvable." });
    }
    handleErreur(res, error);
  }
};

// Supprime une formation
const deleteFormation = async (req, res) => {
  try {
    await formationService.deleteFormation(req.params.id, req.user.entrepriseId);
    res.status(200).json({ success: true, message: "Formation supprimée." });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Formation introuvable." });
    }
    handleErreur(res, error);
  }
};

// PUT /api/formations/:id/demarrer
const demarrer = async (req, res) => {
  try {
    const formation = await formationService.demarrer(req.params.id, req.user.entrepriseId);
    res.status(200).json({ success: true, data: formation });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/formations/:id/terminer
const terminer = async (req, res) => {
  try {
    const formation = await formationService.terminerFormation(req.params.id, req.user.entrepriseId);
    res.status(200).json({ success: true, data: formation });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/formations/:id/annuler
const annuler = async (req, res) => {
  try {
    const formation = await formationService.annuler(req.params.id, req.user.entrepriseId);
    res.status(200).json({ success: true, data: formation });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/formations/:id/participants/:userId/presence
const marquerPresence = async (req, res) => {
  try {
    const participation = await formationService.marquerPresence(
      req.params.id, req.params.userId, Boolean(req.body.present), req.user.entrepriseId
    );
    res.status(200).json({ success: true, data: participation });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/formations/:id/participants/:userId/valider
const validerParticipant = async (req, res) => {
  try {
    const participation = await formationService.validerParticipant(req.params.id, req.params.userId, req.user.entrepriseId);
    res.status(200).json({ success: true, data: participation });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/formations/mes-formations
const getMesFormations = async (req, res) => {
  try {
    const participations = await formationService.getFormationsByEmploye(req.user.userId);
    res.status(200).json({ success: true, data: participations });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/formations/stats
const getStats = async (req, res) => {
  try {
    const stats = await formationService.getStats(req.user.entrepriseId);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = {
  getAllFormations,
  getFormationById,
  createFormation,
  updateFormation,
  deleteFormation,
  demarrer,
  terminer,
  annuler,
  marquerPresence,
  validerParticipant,
  getMesFormations,
  getStats,
};
