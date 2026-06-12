// Importation du service Habilitations (la logique métier)
const habilitationService = require("../services/habilitationService");

// Récupère toutes les habilitations
const getAllHabilitations = async (req, res) => {
  try {
    const habilitations = await habilitationService.getAllHabilitations();
    res.status(200).json({ success: true, data: habilitations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Récupère les habilitations expirant dans moins de 30 jours (logique sécurité)
const getHabilitationsExpirantes = async (req, res) => {
  try {
    const habilitations = await habilitationService.getHabilitationsExpirantes();
    res.status(200).json({ success: true, data: habilitations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Récupère une habilitation par son id
const getHabilitationById = async (req, res) => {
  try {
    const habilitation = await habilitationService.getHabilitationById(req.params.id);
    if (!habilitation) {
      return res.status(404).json({ success: false, message: "Habilitation introuvable." });
    }
    res.status(200).json({ success: true, data: habilitation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crée une nouvelle habilitation
const createHabilitation = async (req, res) => {
  try {
    const habilitation = await habilitationService.createHabilitation(req.body);
    res.status(201).json({ success: true, data: habilitation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Met à jour une habilitation
const updateHabilitation = async (req, res) => {
  try {
    const habilitation = await habilitationService.updateHabilitation(req.params.id, req.body);
    res.status(200).json({ success: true, data: habilitation });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Habilitation introuvable." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Supprime une habilitation
const deleteHabilitation = async (req, res) => {
  try {
    await habilitationService.deleteHabilitation(req.params.id);
    res.status(200).json({ success: true, message: "Habilitation supprimée." });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Habilitation introuvable." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export des fonctions du contrôleur
module.exports = {
  getAllHabilitations,
  getHabilitationsExpirantes,
  getHabilitationById,
  createHabilitation,
  updateHabilitation,
  deleteHabilitation,
};
