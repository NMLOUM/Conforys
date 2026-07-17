const incidentService = require("../services/incidentService");
const { genererRapportIncident } = require("../services/incidentPdfService");
const { handleErreur } = require("../utils/handleErreur");

// Récupère les incidents avec filtres (?statut=&type=&gravite=) et pagination (?page=&limit=)
const getAllIncidents = async (req, res) => {
  try {
    const { userId, role, entrepriseId } = req.user;
    const { statut, type, gravite } = req.query;
    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await incidentService.getAllIncidents(
      userId, role, entrepriseId,
      { statut, type, gravite, page, limit }
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Récupère un incident par son id
const getIncidentById = async (req, res) => {
  try {
    const incident = await incidentService.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident introuvable." });
    }
    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Crée un nouvel incident — le déclarant est tiré du token, jamais du corps
const createIncident = async (req, res) => {
  try {
    const incident = await incidentService.createIncident(req.body, req.user.userId);
    res.status(201).json({ success: true, data: incident });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Met à jour un incident
const updateIncident = async (req, res) => {
  try {
    const incident = await incidentService.updateIncident(req.params.id, req.body);
    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Supprime un incident
const deleteIncident = async (req, res) => {
  try {
    await incidentService.deleteIncident(req.params.id);
    res.status(200).json({ success: true, message: "Incident supprimé." });
  } catch (error) {
    handleErreur(res, error);
  }
};

// ── Workflow de statuts ────────────────────────────────────────────────────────

// BROUILLON → OUVERT (le déclarant soumet son propre incident)
const soumettre = async (req, res) => {
  try {
    const incident = await incidentService.soumettre(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    handleErreur(res, error);
  }
};

// OUVERT → EN_COURS (QHSE/ADMIN valide, pas le déclarant)
const valider = async (req, res) => {
  try {
    const incident = await incidentService.valider(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    handleErreur(res, error);
  }
};

// OUVERT → REJETE (QHSE/ADMIN) — motif obligatoire dans le corps
const rejeter = async (req, res) => {
  try {
    const incident = await incidentService.rejeter(req.params.id, req.body.motifRejet, req.user.userId);
    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    handleErreur(res, error);
  }
};

// EN_COURS → CLOS (QHSE/ADMIN, remplit dateCloture)
const cloturer = async (req, res) => {
  try {
    const incident = await incidentService.cloturer(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Génère et télécharge le rapport PDF de l'incident (PDF généré à la volée,
// jamais stocké sur le serveur)
const genererRapportPdf = async (req, res) => {
  try {
    const { doc, filename } = await genererRapportIncident(req.params.id);
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
  getAllIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
  soumettre,
  valider,
  rejeter,
  cloturer,
  genererRapportPdf,
};