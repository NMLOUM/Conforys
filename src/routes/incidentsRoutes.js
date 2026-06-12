// Importation d'Express et de son routeur
const express = require("express");
const router = express.Router();
// Importation des fonctions du contrôleur Incidents
const {
  getAllIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
} = require("../controllers/incidentsController");
// Importation du middleware de protection
const { protect } = require("../middlewares/authMiddleware");

// Toutes les routes incidents sont protégées (token requis)

// GET /api/incidents       →  liste tous les incidents
router.get("/", protect, getAllIncidents);
// GET /api/incidents/:id   →  détail d'un incident
router.get("/:id", protect, getIncidentById);
// POST /api/incidents      →  crée un incident
router.post("/", protect, createIncident);
// PUT /api/incidents/:id   →  met à jour un incident
router.put("/:id", protect, updateIncident);
// DELETE /api/incidents/:id →  supprime un incident
router.delete("/:id", protect, deleteIncident);

// Export du routeur pour le brancher dans app.js
module.exports = router;