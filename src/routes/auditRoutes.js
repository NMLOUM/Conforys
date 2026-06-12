// Importation d'Express et de son routeur
const express = require("express");
const router = express.Router();
// Importation des fonctions du contrôleur Audits
const {
  getAllAudits,
  getAuditById,
  createAudit,
  updateAudit,
  deleteAudit,
} = require("../controllers/auditController");
// Importation du middleware de protection
const { protect } = require("../middlewares/authMiddleware");

// GET /api/audits        →  liste tous les audits
router.get("/", protect, getAllAudits);
// GET /api/audits/:id    →  détail d'un audit
router.get("/:id", protect, getAuditById);
// POST /api/audits       →  crée un audit
router.post("/", protect, createAudit);
// PUT /api/audits/:id    →  met à jour un audit
router.put("/:id", protect, updateAudit);
// DELETE /api/audits/:id →  supprime un audit
router.delete("/:id", protect, deleteAudit);

// Export du routeur
module.exports = router;