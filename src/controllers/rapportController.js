const { genererSynthese } = require("../services/rapportPdfService");
const { handleErreur } = require("../utils/handleErreur");

// GET /api/rapports/synthese-pdf?dateDebut=&dateFin=&siteId=
// Génère et télécharge le bilan de sécurité sur la période (PDF à la volée,
// jamais stocké sur le serveur). L'entreprise du demandeur scope toutes les
// données agrégées — pas de fuite entre entreprises.
const genererSynthesePdf = async (req, res) => {
  try {
    const { dateDebut, dateFin, siteId } = req.query;
    const { entrepriseId } = req.user;
    const { doc, filename } = await genererSynthese({ dateDebut, dateFin, siteId: siteId || null, entrepriseId });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { genererSynthesePdf };
