// Importation du service EPI (la logique métier)
const epiService = require("../services/epiService");

// Récupère tous les EPI
const getAllEpis = async (req, res) => {
  try {
    const epis = await epiService.getAllEpis();
    res.status(200).json({ success: true, data: epis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Récupère les EPI en alerte de stock (sous le seuil)
const getEpisEnAlerte = async (req, res) => {
  try {
    const epis = await epiService.getEpisEnAlerte();
    res.status(200).json({ success: true, data: epis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Récupère un EPI par son id
const getEpiById = async (req, res) => {
  try {
    const epi = await epiService.getEpiById(req.params.id);
    if (!epi) {
      return res.status(404).json({
        success: false,
        message: "EPI introuvable.",
      });
    }
    res.status(200).json({ success: true, data: epi });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crée un nouvel EPI
const createEpi = async (req, res) => {
  try {
    const epi = await epiService.createEpi(req.body);
    res.status(201).json({ success: true, data: epi });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Met à jour un EPI
const updateEpi = async (req, res) => {
  try {
    const epi = await epiService.updateEpi(req.params.id, req.body);
    res.status(200).json({ success: true, data: epi });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Supprime un EPI
const deleteEpi = async (req, res) => {
  try {
    await epiService.deleteEpi(req.params.id);
    res.status(200).json({ success: true, message: "EPI supprimé." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export des fonctions du contrôleur
module.exports = {
  getAllEpis,
  getEpisEnAlerte,
  getEpiById,
  createEpi,
  updateEpi,
  deleteEpi,
};