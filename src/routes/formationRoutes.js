const express = require("express");
const router = express.Router();
const {
  getAllFormations, getFormationById,
  createFormation, updateFormation, deleteFormation,
} = require("../controllers/formationController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }       = require("../middlewares/validate");
const { formationSchema } = require("../validators/formationValidator");

// Lecture  →  tous les rôles
router.get("/",    protect, getAllFormations);
router.get("/:id", protect, getFormationById);

// Écritures  →  RESPONSABLE_QHSE uniquement
router.post("/",      protect, authorize("RESPONSABLE_QHSE"), validate(formationSchema), createFormation);
router.put("/:id",    protect, authorize("RESPONSABLE_QHSE"), updateFormation);
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deleteFormation);

module.exports = router;
