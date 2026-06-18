const express = require("express");
const router = express.Router();
const {
  getAllAudits, getAuditById,
  createAudit, updateAudit, deleteAudit,
} = require("../controllers/auditController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// Lecture  →  tous les rôles
router.get("/",    protect, getAllAudits);
router.get("/:id", protect, getAuditById);

// Écritures  →  ADMIN et RESPONSABLE_QHSE
router.post("/",      protect, authorize("ADMIN", "RESPONSABLE_QHSE"), createAudit);
router.put("/:id",    protect, authorize("ADMIN", "RESPONSABLE_QHSE"), updateAudit);
router.delete("/:id", protect, authorize("ADMIN", "RESPONSABLE_QHSE"), deleteAudit);

module.exports = router;
