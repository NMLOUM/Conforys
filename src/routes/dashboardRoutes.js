// Importation d'Express et de son routeur
const express = require("express");
const router = express.Router();
// Importation de la fonction du contrôleur Dashboard
const { getIncidentStats } = require("../controllers/dashboardController");
// Importation du middleware de protection
const { protect } = require("../middlewares/authMiddleware");

// GET /api/dashboard/incidents  →  statistiques des incidents (protégé)
router.get("/incidents", protect, getIncidentStats);

// Export du routeur
module.exports = router;