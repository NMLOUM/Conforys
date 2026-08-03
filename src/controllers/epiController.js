const epiService = require("../services/epiService");
const { handleErreur } = require("../utils/handleErreur");

const getAllEpis = async (req, res) => {
  try {
    const epis = await epiService.getAllEpis(req.user.entrepriseId);
    res.status(200).json({ success: true, data: epis });
  } catch (error) {
    handleErreur(res, error);
  }
};

const getEpisEnAlerte = async (req, res) => {
  try {
    const epis = await epiService.getEpisEnAlerte(req.user.entrepriseId);
    res.status(200).json({ success: true, data: epis });
  } catch (error) {
    handleErreur(res, error);
  }
};

const getEpiById = async (req, res) => {
  try {
    const epi = await epiService.getEpiById(req.params.id, req.user.entrepriseId);
    if (!epi) {
      return res.status(404).json({ success: false, message: "EPI introuvable." });
    }
    res.status(200).json({ success: true, data: epi });
  } catch (error) {
    handleErreur(res, error);
  }
};

const createEpi = async (req, res) => {
  try {
    const epi = await epiService.createEpi(req.body, req.user.entrepriseId, req.user.userId);
    res.status(201).json({ success: true, data: epi });
  } catch (error) {
    handleErreur(res, error);
  }
};

const updateEpi = async (req, res) => {
  try {
    const epi = await epiService.updateEpi(req.params.id, req.body, req.user.entrepriseId, req.user.userId);
    res.status(200).json({ success: true, data: epi });
  } catch (error) {
    handleErreur(res, error);
  }
};

const deleteEpi = async (req, res) => {
  try {
    await epiService.deleteEpi(req.params.id, req.user.entrepriseId);
    res.status(200).json({ success: true, message: "EPI supprimé." });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getAllEpis, getEpisEnAlerte, getEpiById, createEpi, updateEpi, deleteEpi };
