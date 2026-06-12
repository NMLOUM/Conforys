// Importation d'Express et de son routeur
const express = require("express");
const router = express.Router();
// Importation des fonctions du contrôleur EPI
const {
  getAllEpis,
  getEpisEnAlerte,
  getEpiById,
  createEpi,
  updateEpi,
  deleteEpi,
} = require("../controllers/epiController");
// Importation du middleware de protection
const { protect } = require("../middlewares/authMiddleware");

// GET /api/epis/alertes  →  EPI sous le seuil de stock
// ⚠️ Placé AVANT /:id pour ne pas être confondu avec un id
router.get("/alertes", protect, getEpisEnAlerte);

// GET /api/epis          →  liste tous les EPI
router.get("/", protect, getAllEpis);
// GET /api/epis/:id      →  détail d'un EPI
router.get("/:id", protect, getEpiById);
// POST /api/epis         →  crée un EPI
router.post("/", protect, createEpi);
// PUT /api/epis/:id      →  met à jour un EPI
router.put("/:id", protect, updateEpi);
// DELETE /api/epis/:id   →  supprime un EPI
router.delete("/:id", protect, deleteEpi);

// Export du routeur
module.exports = router;