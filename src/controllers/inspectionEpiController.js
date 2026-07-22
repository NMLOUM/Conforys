const inspectionEpiService = require("../services/inspectionEpiService");
const { handleErreur } = require("../utils/handleErreur");

// POST /api/epis/:id/inspections — enregistre une inspection (RESPONSABLE_QHSE)
const enregistrerInspection = async (req, res) => {
  try {
    const inspection = await inspectionEpiService.enregistrerInspection(req.params.id, {
      ...req.body,
      inspecteurId: req.user.userId,
    });
    res.status(201).json({ success: true, data: inspection });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/epis/:id/inspections — historique des inspections d'un EPI
const getInspectionsByEpi = async (req, res) => {
  try {
    const inspections = await inspectionEpiService.getInspectionsByEpi(req.params.id);
    res.status(200).json({ success: true, data: inspections });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/inspections — journal global (RESPONSABLE_QHSE, ADMIN)
const getToutesInspections = async (req, res) => {
  try {
    const { entrepriseId } = req.user;
    const inspections = await inspectionEpiService.getToutesInspections(entrepriseId);
    res.status(200).json({ success: true, data: inspections });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { enregistrerInspection, getInspectionsByEpi, getToutesInspections };
