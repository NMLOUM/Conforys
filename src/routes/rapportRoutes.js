const express = require("express");
const router = express.Router();
const { genererSynthesePdf } = require("../controllers/rapportController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validateQuery } = require("../middlewares/validate");
const { rapportSyntheseSchema } = require("../validators/rapportValidator");

// Bilan de sécurité par période — RESPONSABLE_QHSE et ADMIN uniquement
router.get(
  "/synthese-pdf",
  protect,
  authorize("RESPONSABLE_QHSE", "ADMIN"),
  validateQuery(rapportSyntheseSchema),
  genererSynthesePdf
);

module.exports = router;
