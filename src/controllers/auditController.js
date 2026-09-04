const auditService = require("../services/auditService");
const { genererRapportAudit } = require("../services/auditPdfService");
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

// Historique des scores des audits terminés (filtres optionnels : siteId, type)
const getHistoriqueScores = async (req, res) => {
  try {
    const { siteId, type } = req.query;
    const historique = await auditService.getHistoriqueScores(req.user.entrepriseId, { siteId, type });
    res.status(200).json({ success: true, data: historique });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Récupère tous les audits
const getAllAudits = async (req, res) => {
  try {
    const audits = await auditService.getAllAudits(req.user.entrepriseId);
    res.status(200).json({ success: true, data: audits });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Récupère un audit par son id
const getAuditById = async (req, res) => {
  try {
    const audit = await auditService.getAuditById(req.params.id, req.user.entrepriseId);
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
    const audit = await auditService.createAudit(req.body, req.user.userId, req.user.entrepriseId);
    res.status(201).json({ success: true, data: audit });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Met à jour un audit
const updateAudit = async (req, res) => {
  try {
    const audit = await auditService.updateAudit(req.params.id, req.body, req.user.entrepriseId);
    res.status(200).json({ success: true, data: audit });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Supprime un audit
const deleteAudit = async (req, res) => {
  try {
    await auditService.deleteAudit(req.params.id, req.user.entrepriseId);
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
      req.body,
      req.user.userId,
      req.user.entrepriseId
    );
    res.status(200).json({ success: true, data: audit });
  } catch (error) {
    handleErreur(res, error);
  }
};

// ── Workflow de statuts ────────────────────────────────────────────────────────

// PLANIFIE → EN_COURS
const demarrer = async (req, res) => {
  try {
    const audit = await auditService.demarrer(req.params.id, req.user.userId, req.user.entrepriseId);
    res.status(200).json({ success: true, data: audit });
  } catch (error) {
    handleErreur(res, error);
  }
};

// EN_COURS → TERMINE
const finaliser = async (req, res) => {
  try {
    const audit = await auditService.finaliser(req.params.id, req.user.userId, req.user.entrepriseId);
    res.status(200).json({ success: true, data: audit });
  } catch (error) {
    handleErreur(res, error);
  }
};

// * → ANNULE
const annuler = async (req, res) => {
  try {
    const audit = await auditService.annuler(req.params.id, req.user.userId, req.user.entrepriseId);
    res.status(200).json({ success: true, data: audit });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/audits/:id/historique — piste d'audit en lecture seule
const getHistorique = async (req, res) => {
  try {
    const historique = await auditService.getHistoriqueByAudit(req.params.id, req.user.entrepriseId);
    res.status(200).json({ success: true, data: historique });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Génère et télécharge le rapport PDF de l'audit (PDF généré à la volée,
// jamais stocké sur le serveur)
const genererRapportPdf = async (req, res) => {
  try {
    const { doc, filename } = await genererRapportAudit(req.params.id, req.user.entrepriseId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    handleErreur(res, error);
  }
};

// Export des fonctions du contrôleur
module.exports = {
  getTemplates,
  getHistoriqueScores,
  getAllAudits,
  getAuditById,
  createAudit,
  updateAudit,
  deleteAudit,
  repondreQuestion,
  demarrer,
  finaliser,
  annuler,
  genererRapportPdf,
  getHistorique,
};