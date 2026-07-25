const express = require("express");
const router = express.Router();
const {
  getAllRisques, getMatrice, getRisqueById,
  createRisque, updateRisque, deleteRisque, genererAction,
} = require("../controllers/risqueController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }  = require("../middlewares/validate");
const { risqueSchema, updateRisqueSchema } = require("../validators/risqueValidator");

// ⚠️ Route spécifique placée avant /:id pour éviter le conflit
router.get("/matrice", protect, getMatrice);

// Lecture → tous les rôles
router.get("/",    protect, getAllRisques);
router.get("/:id", protect, getRisqueById);

// Écritures → RESPONSABLE_QHSE uniquement
router.post("/",      protect, authorize("RESPONSABLE_QHSE"), validate(risqueSchema), createRisque);
router.put("/:id",    protect, authorize("RESPONSABLE_QHSE"), validate(updateRisqueSchema), updateRisque);
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deleteRisque);

// Génération d'une action de prévention — RESPONSABLE_QHSE uniquement
router.post("/:id/generer-action", protect, authorize("RESPONSABLE_QHSE"), genererAction);

module.exports = router;
