const auditService = require("../services/auditService");
const { handleErreur } = require("../utils/handleErreur");

// Liste des templates de checklist disponibles (cartes de sélection à la création)
const getTemplates = async (req, res) => {
  try {
    const templates = auditService.getTemplates();
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Récupère tous les audits
const getAllAudits = async (req, res) => {
  try {
    const audits = await auditService.getAllAudits();
    res.status(200).json({ success: true, data: audits });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Récupère un audit par son id
const getAuditById = async (req, res) => {
  try {
    const audit = await auditService.getAuditById(req.params.id);
    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit introuvable.",
      });
    }
    res.status(200).json({ success: true, data: audit });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Crée un nouvel audit
const createAudit = async (req, res) => {
  try {
    const audit = await auditService.createAudit(req.body);
    res.status(201).json({ success: true, data: audit });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Met à jour un audit
const updateAudit = async (req, res) => {
  try {
    const audit = await auditService.updateAudit(req.params.id, req.body);
    res.status(200).json({ success: true, data: audit });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Supprime un audit
const deleteAudit = async (req, res) => {
  try {
    await auditService.deleteAudit(req.params.id);
    res.status(200).json({ success: true, message: "Audit supprimé." });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Répond à une question de la checklist et recalcule le score de l'audit
const repondreQuestion = async (req, res) => {
  try {
    const audit = await auditService.repondreQuestion(
      req.params.id,
      req.params.questionId,
      req.body
    );
    res.status(200).json({ success: true, data: audit });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Export des fonctions du contrôleur
module.exports = {
  getTemplates,
  getAllAudits,
  getAuditById,
  createAudit,
  updateAudit,
  deleteAudit,
  repondreQuestion,
};