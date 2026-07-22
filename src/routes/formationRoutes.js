const express = require("express");
const router = express.Router();
const {
  getAllFormations, getFormationById,
  createFormation, updateFormation, deleteFormation,
  demarrer, terminer, annuler,
  marquerPresence, validerParticipant,
  getMesFormations, getStats,
} = require("../controllers/formationController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }  = require("../middlewares/validate");
const { formationSchema, presenceSchema } = require("../validators/formationValidator");

// ⚠️ Routes spécifiques placées avant /:id pour éviter le conflit
// Formations auxquelles l'utilisateur connecté participe — tous rôles
router.get("/mes-formations", protect, getMesFormations);
// Statistiques (cartes de synthèse) — tous rôles (lecture)
router.get("/stats", protect, getStats);

// Lecture  →  tous les rôles
router.get("/",    protect, getAllFormations);
router.get("/:id", protect, getFormationById);

// Écritures  →  RESPONSABLE_QHSE uniquement
router.post("/",      protect, authorize("RESPONSABLE_QHSE"), validate(formationSchema), createFormation);
router.put("/:id",    protect, authorize("RESPONSABLE_QHSE"), updateFormation);
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deleteFormation);

// ── Workflow de statut — RESPONSABLE_QHSE uniquement ──────────────────────────
router.put("/:id/demarrer", protect, authorize("RESPONSABLE_QHSE"), demarrer);
router.put("/:id/terminer", protect, authorize("RESPONSABLE_QHSE"), terminer);
router.put("/:id/annuler",  protect, authorize("RESPONSABLE_QHSE"), annuler);

// ── Présence et validation par participant — RESPONSABLE_QHSE uniquement ─────
router.put(
  "/:id/participants/:userId/presence",
  protect, authorize("RESPONSABLE_QHSE"), validate(presenceSchema), marquerPresence
);
router.put(
  "/:id/participants/:userId/valider",
  protect, authorize("RESPONSABLE_QHSE"), validerParticipant
);

module.exports = router;
