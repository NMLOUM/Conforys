const express = require("express");
const router = express.Router();
const {
  getAllEntreprises, getEntrepriseById,
  createEntreprise, updateEntreprise, deleteEntreprise,
} = require("../controllers/entrepriseController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// Lecture  →  ADMIN et RESPONSABLE_QHSE
router.get("/",    protect, authorize("ADMIN", "RESPONSABLE_QHSE"), getAllEntreprises);
router.get("/:id", protect, authorize("ADMIN", "RESPONSABLE_QHSE"), getEntrepriseById);

// Écritures →  ADMIN uniquement
router.post("/",    protect, authorize("ADMIN"), createEntreprise);
router.put("/:id",  protect, authorize("ADMIN"), updateEntreprise);
router.delete("/:id", protect, authorize("ADMIN"), deleteEntreprise);

module.exports = router;
