const express = require("express");
const router = express.Router();
const {
  getAllFormations, getFormationById,
  createFormation, updateFormation, deleteFormation,
} = require("../controllers/formationController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// Lecture  →  tous les rôles
router.get("/",    protect, getAllFormations);
router.get("/:id", protect, getFormationById);

// Écritures  →  ADMIN et RESPONSABLE_QHSE
router.post("/",      protect, authorize("ADMIN", "RESPONSABLE_QHSE"), createFormation);
router.put("/:id",    protect, authorize("ADMIN", "RESPONSABLE_QHSE"), updateFormation);
router.delete("/:id", protect, authorize("ADMIN", "RESPONSABLE_QHSE"), deleteFormation);

module.exports = router;
