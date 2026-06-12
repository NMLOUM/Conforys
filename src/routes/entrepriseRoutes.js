// Importation d'Express et de son routeur
const express = require("express");
const router = express.Router();
// Importation des fonctions du contrôleur Entreprise
const {
  getAllEntreprises,
  getEntrepriseById,
  createEntreprise,
  updateEntreprise,
  deleteEntreprise,
} = require("../controllers/entrepriseController");
// Importation du middleware de protection
const { protect } = require("../middlewares/authMiddleware");

// GET /api/entreprises  →  liste toutes les entreprises (PROTÉGÉ)
router.get("/", protect, getAllEntreprises);
// GET /api/entreprises/:id  →  récupère une entreprise par son id (PROTÉGÉ)
router.get("/:id", protect, getEntrepriseById);
// POST /api/entreprises  →  crée une nouvelle entreprise (PROTÉGÉ)
router.post("/", protect, createEntreprise);
// PUT /api/entreprises/:id  →  met à jour une entreprise (PROTÉGÉ)
router.put("/:id", protect, updateEntreprise);
// DELETE /api/entreprises/:id  →  supprime une entreprise (PROTÉGÉ)
router.delete("/:id", protect, deleteEntreprise);

// Export du routeur pour le brancher dans app.js
module.exports = router;
