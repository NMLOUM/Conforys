const express = require("express");
const router = express.Router();
const { getToutesInspections } = require("../controllers/inspectionEpiController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// Journal global des inspections — RESPONSABLE_QHSE et ADMIN uniquement
router.get("/", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), getToutesInspections);

module.exports = router;
