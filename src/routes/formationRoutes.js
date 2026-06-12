// Importation d'Express et de son routeur
const express = require("express");
const router = express.Router();
// Importation des fonctions du contrôleur Formations
const {
  getAllFormations,
  getFormationById,
  createFormation,
  updateFormation,
  deleteFormation,
} = require("../controllers/formationController");
// Importation du middleware de protection
const { protect } = require("../middlewares/authMiddleware");

// GET /api/formations        →  liste toutes les formations (PROTÉGÉ)
router.get("/", protect, getAllFormations);
// GET /api/formations/:id    →  détail d'une formation (PROTÉGÉ)
router.get("/:id", protect, getFormationById);
// POST /api/formations       →  crée une formation (PROTÉGÉ)
router.post("/", protect, createFormation);
// PUT /api/formations/:id    →  met à jour une formation (PROTÉGÉ)
router.put("/:id", protect, updateFormation);
// DELETE /api/formations/:id →  supprime une formation (PROTÉGÉ)
router.delete("/:id", protect, deleteFormation);

// Export du routeur pour le brancher dans app.js
module.exports = router;
