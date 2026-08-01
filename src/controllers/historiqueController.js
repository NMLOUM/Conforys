 const historiqueService = require("../services/historiqueService");
const actionService     = require("../services/actionService");
const incidentService   = require("../services/incidentService");
const { handleErreur }  = require("../utils/handleErreur");

// GET /api/incidents/:id/historique — piste d'audit en lecture seule, scopée à
// l'entreprise du demandeur (vérifie l'appartenance de l'incident avant de
// lire son historique, comme le fait déjà getHistoriqueAction).
const getHistorique = async (req, res) => {
  try {
    const incident = await incidentService.getIncidentById(req.params.id, req.user.entrepriseId);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident introuvable." });
    }
    const historique = await historiqueService.getHistoriqueByIncident(req.params.id, req.user.entrepriseId);
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

// GET /api/actions/:id/historique — journal d'audit de l'action, lecture seule
// Réutilise getActionById pour l'appartenance entreprise + l'accès (QHSE/ADMIN
// ou responsable assigné) avant de lire le journal.
const getHistoriqueAction = async (req, res) => {
  try {
    await actionService.getActionById(req.params.id, req.user.entrepriseId, {
      userId: req.user.userId,
      role:   req.user.role,
    });
    const historique = await historiqueService.getHistoriqueByAction(req.params.id);
    res.status(200).json({ success: true, data: historique });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getHistorique, getHistoriqueGlobal, getHistoriqueAction };
