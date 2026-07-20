const express = require("express");
const router = express.Router();
const { getHistoriqueGlobal } = require("../controllers/historiqueController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// Journal d'activité global (toutes les entrées HistoriqueIncident, tous
// incidents confondus) — RESPONSABLE_QHSE et ADMIN uniquement
router.get("/global", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), getHistoriqueGlobal);

module.exports = router;
