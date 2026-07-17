const express = require("express");
const router = express.Router();
const {
  getTemplates, getAllAudits, getAuditById,
  createAudit, updateAudit, deleteAudit,
  repondreQuestion,
} = require("../controllers/auditController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }    = require("../middlewares/validate");
const { auditSchema, repondreQuestionSchema } = require("../validators/auditValidator");

// ⚠️ Route spécifique placée avant /:id pour éviter le conflit
// Lecture  →  tous les rôles
router.get("/templates", protect, getTemplates);
router.get("/",          protect, getAllAudits);
router.get("/:id",       protect, getAuditById);

// Écritures  →  RESPONSABLE_QHSE uniquement
router.post("/",      protect, authorize("RESPONSABLE_QHSE"), validate(auditSchema), createAudit);
router.put("/:id",    protect, authorize("RESPONSABLE_QHSE"), updateAudit);
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deleteAudit);

// Réalisation de l'audit : répondre à une question de la checklist
router.put(
  "/:id/questions/:questionId",
  protect,
  authorize("RESPONSABLE_QHSE"),
  validate(repondreQuestionSchema),
  repondreQuestion
);

module.exports = router;
