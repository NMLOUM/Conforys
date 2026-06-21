const express = require("express");
const router = express.Router();
const {
  getAllHabilitations, getHabilitationsExpirantes, getHabilitationById,
  createHabilitation, updateHabilitation, deleteHabilitation,
} = require("../controllers/habilitationController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// ⚠️ Route spécifique placée avant /:id pour éviter le conflit
// Lecture  →  tous les rôles
router.get("/expirantes", protect, getHabilitationsExpirantes);
router.get("/",           protect, getAllHabilitations);
router.get("/:id",        protect, getHabilitationById);

// Écritures  →  RESPONSABLE_QHSE uniquement
router.post("/",      protect, authorize("RESPONSABLE_QHSE"), createHabilitation);
router.put("/:id",    protect, authorize("RESPONSABLE_QHSE"), updateHabilitation);
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deleteHabilitation);

module.exports = router;
