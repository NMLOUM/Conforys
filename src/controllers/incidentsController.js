// Importation du service Incidents (la logique métier)
const incidentService = require("../services/incidentService");

// Utilitaire : centralise la gestion des erreurs métier (400/403) vs erreurs système (500)
const handleErreur = (res, error) => {
  const status = error.statusCode || 500;
  res.status(status).json({ success: false, message: error.message });
};

// Récupère tous les incidents
const getAllIncidents = async (req, res) => {
  try {
    const incidents = await incidentService.getAllIncidents();
    res.status(200).json({ success: true, data: incidents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Récupère un incident par son id
const getIncidentById = async (req, res) => {
  try {
    const incident = await incidentService.getIncidentById(req.params.id);
    // Si aucun incident trouvé avec cet id
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident introuvable.",
      });
    }
    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crée un nouvel incident
const createIncident = async (req, res) => {
  try {
    const incident = await incidentService.createIncident(req.body);
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Supprime un incident
const deleteIncident = async (req, res) => {
  try {
    await incidentService.deleteIncident(req.params.id);
    res.status(200).json({ success: true, message: "Incident supprimé." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

// OUVERT → REJETE (QHSE/ADMIN)
const rejeter = async (req, res) => {
  try {
    const incident = await incidentService.rejeter(req.params.id);
    res.status(200).json({ success: true, data: incident });
  } catch (error) {
    handleErreur(res, error);
  }
};

// EN_COURS → CLOS (QHSE/ADMIN, remplit dateCloture)
const cloturer = async (req, res) => {
  try {
    const incident = await incidentService.cloturer(req.params.id);
    res.status(200).json({ success: true, data: incident });
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
};