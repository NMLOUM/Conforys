const affectationEpiService = require("../services/affectationEpiService");
const { handleErreur } = require("../utils/handleErreur");

// POST /api/epis/:id/affecter — affecte l'EPI à un employé (RESPONSABLE_QHSE)
const affecter = async (req, res) => {
  try {
    const affectation = await affectationEpiService.affecter(
      req.params.id,
      req.body.employeId,
      req.body.poste
    );
    res.status(201).json({ success: true, data: affectation });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/affectations/:id/rendre — restitue l'EPI (RESPONSABLE_QHSE)
const rendre = async (req, res) => {
  try {
    const affectation = await affectationEpiService.rendre(req.params.id);
    res.status(200).json({ success: true, data: affectation });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/epis/:id/affectations — historique des affectations d'un EPI
const getAffectationsByEpi = async (req, res) => {
  try {
    const affectations = await affectationEpiService.getAffectationsByEpi(req.params.id);
    res.status(200).json({ success: true, data: affectations });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/affectations/mes-epis — EPI affectés au connecté (tous rôles)
const getMesEpis = async (req, res) => {
  try {
    const affectations = await affectationEpiService.getAffectationsByEmploye(req.user.userId);
    res.status(200).json({ success: true, data: affectations });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/affectations — journal global (RESPONSABLE_QHSE, ADMIN)
const getToutesAffectations = async (req, res) => {
  try {
    const { entrepriseId } = req.user;
    const affectations = await affectationEpiService.getToutesAffectations(entrepriseId);
    res.status(200).json({ success: true, data: affectations });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { affecter, rendre, getAffectationsByEpi, getMesEpis, getToutesAffectations };
