const historiqueEpiService = require("../services/historiqueEpiService");
const { handleErreur } = require("../utils/handleErreur");

// GET /api/historique/epis — journal complet de toutes les actions EPI
// (création, modification, suppression, affectation, retour, inspection),
// RESPONSABLE_QHSE et ADMIN uniquement, scopé à l'entreprise.
const getHistoriqueGlobal = async (req, res) => {
  try {
    const { entrepriseId } = req.user;
    const { typeAction, auteurId, epiId, dateDebut, dateFin, page, limit } = req.query;
    const resultat = await historiqueEpiService.getHistoriqueGlobal(entrepriseId, {
      typeAction, auteurId, epiId, dateDebut, dateFin, page, limit,
    });
    res.status(200).json({ success: true, ...resultat });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getHistoriqueGlobal };
