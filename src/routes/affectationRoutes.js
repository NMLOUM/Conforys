const express = require("express");
const router = express.Router();
const { rendre, getMesEpis, getToutesAffectations } = require("../controllers/affectationEpiController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// ⚠️ Route spécifique placée avant /:id pour éviter le conflit
// EPI affectés au connecté — tous rôles (un employé voit ses propres EPI)
router.get("/mes-epis", protect, getMesEpis);

// Journal global des affectations — RESPONSABLE_QHSE et ADMIN uniquement
router.get("/", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), getToutesAffectations);

// Restitution d'un EPI affecté — RESPONSABLE_QHSE uniquement
router.put("/:id/rendre", protect, authorize("RESPONSABLE_QHSE"), rendre);

module.exports = router;
