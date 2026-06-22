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

module.exports = { getHistorique };
