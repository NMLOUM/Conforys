// Importation du service Audits (la logique métier)
const auditService = require("../services/auditService");

// Récupère tous les audits
const getAllAudits = async (req, res) => {
  try {
    const audits = await auditService.getAllAudits();
    res.status(200).json({ success: true, data: audits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crée un nouvel audit
const createAudit = async (req, res) => {
  try {
    const audit = await auditService.createAudit(req.body);
    res.status(201).json({ success: true, data: audit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Met à jour un audit
const updateAudit = async (req, res) => {
  try {
    const audit = await auditService.updateAudit(req.params.id, req.body);
    res.status(200).json({ success: true, data: audit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Supprime un audit
const deleteAudit = async (req, res) => {
  try {
    await auditService.deleteAudit(req.params.id);
    res.status(200).json({ success: true, message: "Audit supprimé." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export des fonctions du contrôleur
module.exports = {
  getAllAudits,
  getAuditById,
  createAudit,
  updateAudit,
  deleteAudit,
};