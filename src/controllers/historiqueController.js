 const historiqueService = require("../services/historiqueService");
const { handleErreur }  = require("../utils/handleErreur");

// GET /api/incidents/:id/historique — piste d'audit en lecture seule
const getHistorique = async (req, res) => {
  try {
    const historique = await historiqueService.getHistoriqueByIncident(req.params.id);
    res.status(200).json({ success: true, data: historique });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/historique/global — journal d'activité de tous les incidents
// (RESPONSABLE_QHSE et ADMIN), filtres + pagination, scopé à l'entreprise
const getHistoriqueGlobal = async (req, res) => {
  try {
    const { entrepriseId } = req.user;
    const { typeAction, auteurId, incidentId, dateDebut, dateFin, page, limit } = req.query;
    const resultat = await historiqueService.getHistoriqueGlobal(entrepriseId, {
      typeAction, auteurId, incidentId, dateDebut, dateFin, page, limit,
    });
    res.status(200).json({ success: true, ...resultat });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getHistorique, getHistoriqueGlobal };
