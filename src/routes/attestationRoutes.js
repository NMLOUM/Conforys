const express = require("express");
const router = express.Router();
const {
  getMesAttestations, getToutesAttestations, telechargerPdf, verifier,
} = require("../controllers/attestationController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validateQuery } = require("../middlewares/validate");
const { listeAttestationsSchema } = require("../validators/attestationValidator");

// ⚠️ Route publique — AUCUNE authentification (sert à vérifier une attestation
// présentée par un employé, ex: en scannant le QR code du PDF)
router.get("/verifier/:code", verifier);

// Attestations de l'utilisateur connecté — tous rôles
router.get("/mes-attestations", protect, getMesAttestations);

// Journal complet des attestations délivrées — RESPONSABLE_QHSE et ADMIN uniquement
router.get("/", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), validateQuery(listeAttestationsSchema), getToutesAttestations);

// Téléchargement du PDF — bénéficiaire, RESPONSABLE_QHSE ou ADMIN (vérifié dans le service)
router.get("/:id/pdf", protect, telechargerPdf);

module.exports = router;
