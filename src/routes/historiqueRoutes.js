const express = require("express");
const router = express.Router();
const {
  getHistoriqueGlobal,
  getHistoriqueGlobalRisque, getHistoriqueGlobalAction,
  getHistoriqueGlobalAudit, getHistoriqueGlobalFormation,
} = require("../controllers/historiqueController");
const { getHistoriqueGlobal: getHistoriqueGlobalEpi } = require("../controllers/historiqueEpiController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// Journal d'activité global (toutes les entrées HistoriqueIncident, tous
// incidents confondus) — RESPONSABLE_QHSE et ADMIN uniquement
router.get("/global", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), getHistoriqueGlobal);

// Journal complet des EPI (création, modification, suppression, affectation,
// retour, inspection), tous EPI confondus — RESPONSABLE_QHSE et ADMIN uniquement
router.get("/epis", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), getHistoriqueGlobalEpi);

// Journal global DUERP (tous les risques confondus) — RESPONSABLE_QHSE et ADMIN uniquement
router.get("/risques", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), getHistoriqueGlobalRisque);

// Journal global CAPA (toutes les actions correctives confondues) — RESPONSABLE_QHSE et ADMIN uniquement
router.get("/actions", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), getHistoriqueGlobalAction);

// Journal global Audits (tous les audits confondus) — RESPONSABLE_QHSE et ADMIN uniquement
router.get("/audits", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), getHistoriqueGlobalAudit);

// Journal global Formations (toutes les sessions confondues) — RESPONSABLE_QHSE et ADMIN uniquement
router.get("/formations", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), getHistoriqueGlobalFormation);

module.exports = router;
