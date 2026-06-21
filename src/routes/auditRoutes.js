const express = require("express");
const router = express.Router();
const {
  getAllAudits, getAuditById,
  createAudit, updateAudit, deleteAudit,
} = require("../controllers/auditController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }    = require("../middlewares/validate");
const { auditSchema } = require("../validators/auditValidator");

// Lecture  →  tous les rôles
router.get("/",    protect, getAllAudits);
router.get("/:id", protect, getAuditById);

// Écritures  →  RESPONSABLE_QHSE uniquement
router.post("/",      protect, authorize("RESPONSABLE_QHSE"), validate(auditSchema), createAudit);
router.put("/:id",    protect, authorize("RESPONSABLE_QHSE"), updateAudit);
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deleteAudit);

module.exports = router;
