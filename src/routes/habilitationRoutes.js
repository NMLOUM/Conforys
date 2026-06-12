// Importation d'Express et de son routeur
const express = require("express");
const router = express.Router();
// Importation des fonctions du contrôleur Habilitations
const {
  getAllHabilitations,
  getHabilitationsExpirantes,
  getHabilitationById,
  createHabilitation,
  updateHabilitation,
  deleteHabilitation,
} = require("../controllers/habilitationController");
// Importation du middleware de protection
const { protect } = require("../middlewares/authMiddleware");

// GET /api/habilitations/expirantes  →  habilitations expirant dans < 30 jours (PROTÉGÉ)
// ⚠️ Placé AVANT /:id pour ne pas être confondu avec un identifiant
router.get("/expirantes", protect, getHabilitationsExpirantes);

// GET /api/habilitations        →  liste toutes les habilitations (PROTÉGÉ)
router.get("/", protect, getAllHabilitations);
// GET /api/habilitations/:id    →  détail d'une habilitation (PROTÉGÉ)
router.get("/:id", protect, getHabilitationById);
// POST /api/habilitations       →  crée une habilitation (PROTÉGÉ)
router.post("/", protect, createHabilitation);
// PUT /api/habilitations/:id    →  met à jour une habilitation (PROTÉGÉ)
router.put("/:id", protect, updateHabilitation);
// DELETE /api/habilitations/:id →  supprime une habilitation (PROTÉGÉ)
router.delete("/:id", protect, deleteHabilitation);

// Export du routeur pour le brancher dans app.js
module.exports = router;
