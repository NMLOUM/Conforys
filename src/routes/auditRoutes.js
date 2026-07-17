const express = require("express");
const router = express.Router();
const {
  getTemplates, getHistoriqueScores, getAllAudits, getAuditById,
  createAudit, updateAudit, deleteAudit,
  repondreQuestion, demarrer, finaliser, annuler,
} = require("../controllers/auditController");
const { getActionsByAudit, genererActionsDepuisAudit } = require("../controllers/actionController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }    = require("../middlewares/validate");
const { auditSchema, updateAuditSchema, repondreQuestionSchema } = require("../validators/auditValidator");

// ⚠️ Routes spécifiques placées avant /:id pour éviter le conflit
// Lecture  →  tous les rôles
router.get("/templates",         protect, getTemplates);
router.get("/historique-scores", protect, getHistoriqueScores);
router.get("/",                  protect, getAllAudits);
router.get("/:id",               protect, getAuditById);

// Écritures  →  RESPONSABLE_QHSE uniquement
router.post("/",      protect, authorize("RESPONSABLE_QHSE"), validate(auditSchema), createAudit);
router.put("/:id",    protect, authorize("RESPONSABLE_QHSE"), validate(updateAuditSchema), updateAudit);
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deleteAudit);

// ── Workflow de statuts : PLANIFIE → EN_COURS → TERMINE (ou ANNULE) ──────────
router.put("/:id/demarrer",  protect, authorize("RESPONSABLE_QHSE"), demarrer);
router.put("/:id/finaliser", protect, authorize("RESPONSABLE_QHSE"), finaliser);
router.put("/:id/annuler",   protect, authorize("RESPONSABLE_QHSE"), annuler);

// Réalisation de l'audit : répondre à une question de la checklist (audit EN_COURS uniquement)
router.put(
  "/:id/questions/:questionId",
  protect,
  authorize("RESPONSABLE_QHSE"),
  validate(repondreQuestionSchema),
  repondreQuestion
);

// ── Actions correctives (CAPA) générées depuis les non-conformités ───────────
// GET  /api/audits/:id/actions           → liste des CAPA de l'audit (tous rôles)
router.get("/:id/actions", protect, getActionsByAudit);

// POST /api/audits/:id/generer-actions   → génération automatique (RESPONSABLE_QHSE)
router.post("/:id/generer-actions", protect, authorize("RESPONSABLE_QHSE"), genererActionsDepuisAudit);

module.exports = router;
