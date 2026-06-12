// Importation du service Formations (la logique métier)
const formationService = require("../services/formationService");

// Récupère toutes les formations
const getAllFormations = async (req, res) => {
  try {
    const formations = await formationService.getAllFormations();
    res.status(200).json({ success: true, data: formations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Récupère une formation par son id
const getFormationById = async (req, res) => {
  try {
    const formation = await formationService.getFormationById(req.params.id);
    if (!formation) {
      return res.status(404).json({ success: false, message: "Formation introuvable." });
    }
    res.status(200).json({ success: true, data: formation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crée une nouvelle formation
const createFormation = async (req, res) => {
  try {
    const formation = await formationService.createFormation(req.body);
    res.status(201).json({ success: true, data: formation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Met à jour une formation
const updateFormation = async (req, res) => {
  try {
    const formation = await formationService.updateFormation(req.params.id, req.body);
    res.status(200).json({ success: true, data: formation });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Formation introuvable." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Supprime une formation
const deleteFormation = async (req, res) => {
  try {
    await formationService.deleteFormation(req.params.id);
    res.status(200).json({ success: true, message: "Formation supprimée." });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Formation introuvable." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export des fonctions du contrôleur
module.exports = {
  getAllFormations,
  getFormationById,
  createFormation,
  updateFormation,
  deleteFormation,
};
