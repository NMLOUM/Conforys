const express = require("express");
const router = express.Router();
const {
  getAllRisques, getMatrice, getRisqueById,
  createRisque, updateRisque, deleteRisque, genererAction,
  getHistoriqueRisque, getStatutRevision, marquerRevise,
  genererRapportPdf,
} = require("../controllers/risqueController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }  = require("../middlewares/validate");
const { risqueSchema, updateRisqueSchema } = require("../validators/risqueValidator");
const { actionSchema } = require("../validators/actionValidator");

// ⚠️ Routes spécifiques placées avant /:id pour éviter le conflit
router.get("/matrice",         protect, getMatrice);
router.get("/statut-revision", protect, getStatutRevision);
router.post("/marquer-revise", protect, authorize("RESPONSABLE_QHSE"), marquerRevise);
router.get("/rapport-pdf",     protect, authorize("RESPONSABLE_QHSE", "ADMIN"), genererRapportPdf);

// Lecture → tous les rôles
router.get("/",    protect, getAllRisques);
router.get("/:id", protect, getRisqueById);
router.get("/:id/historique", protect, getHistoriqueRisque);

// Écritures → RESPONSABLE_QHSE uniquement
router.post("/",      protect, authorize("RESPONSABLE_QHSE"), validate(risqueSchema), createRisque);
router.put("/:id",    protect, authorize("RESPONSABLE_QHSE"), validate(updateRisqueSchema), updateRisque);
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deleteRisque);

// Génération d'une action de prévention — RESPONSABLE_QHSE uniquement, description + responsable saisis au préalable
router.post("/:id/generer-action", protect, authorize("RESPONSABLE_QHSE"), validate(actionSchema), genererAction);

module.exports = router;
