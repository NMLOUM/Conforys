const attestationService = require("../services/attestationService");
const { handleErreur } = require("../utils/handleErreur");

// GET /api/attestations/mes-attestations — attestations de l'utilisateur connecté
const getMesAttestations = async (req, res) => {
  try {
    const attestations = await attestationService.getMesAttestations(req.user.userId);
    res.status(200).json({ success: true, data: attestations });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/attestations — toutes les attestations de l'entreprise (RESPONSABLE_QHSE, ADMIN)
const getToutesAttestations = async (req, res) => {
  try {
    const { entrepriseId } = req.user;
    const { beneficiaireId, recherche, statut } = req.query;
    const attestations = await attestationService.getToutesAttestations(entrepriseId, { beneficiaireId, recherche, statut });
    res.status(200).json({ success: true, data: attestations });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/attestations/:id/pdf — télécharge le PDF (bénéficiaire, QHSE ou ADMIN)
const telechargerPdf = async (req, res) => {
  try {
    const { doc, filename } = await attestationService.genererPdf(req.params.id, req.user);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/attestations/verifier/:code — vérification PUBLIQUE, aucune authentification
const verifier = async (req, res) => {
  try {
    const resultat = await attestationService.verifierParCode(req.params.code);
    if (!resultat) {
      return res.status(404).json({ success: false, message: "Aucune attestation ne correspond à ce code." });
    }
    res.status(200).json({ success: true, data: resultat });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getMesAttestations, getToutesAttestations, telechargerPdf, verifier };
