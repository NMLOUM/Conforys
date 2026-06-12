// Importation du service Incidents (la logique métier)
const incidentService = require("../services/incidentService");

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
    res.status(500).json({ success: false, message: error.message });
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

// Export des fonctions du contrôleur
module.exports = {
  getAllIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
};