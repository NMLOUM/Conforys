const risqueService = require("../services/risqueService");
const { genererRapportRegistre } = require("../services/risquePdfService");
const { handleErreur } = require("../utils/handleErreur");

// GET /api/risques — liste filtrable (siteId, categorie, niveau)
const getAllRisques = async (req, res) => {
  try {
    const { entrepriseId } = req.user;
    const { siteId, categorie, niveau } = req.query;
    const risques = await risqueService.getAllRisques(entrepriseId, { siteId, categorie, niveau });
    res.status(200).json({ success: true, data: risques });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/risques/matrice — répartition par case probabilité × gravité
const getMatrice = async (req, res) => {
  try {
    const { entrepriseId } = req.user;
    const { siteId } = req.query;
    const matrice = await risqueService.getMatrice(entrepriseId, siteId || null);
    res.status(200).json({ success: true, data: matrice });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/risques/:id
const getRisqueById = async (req, res) => {
  try {
    const risque = await risqueService.getRisqueById(req.params.id, req.user.entrepriseId);
    if (!risque) {
      return res.status(404).json({ success: false, message: "Risque introuvable." });
    }
    res.status(200).json({ success: true, data: risque });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/risques — RESPONSABLE_QHSE
const createRisque = async (req, res) => {
  try {
    const risque = await risqueService.createRisque(req.body, req.user.userId, req.user.entrepriseId);
    res.status(201).json({ success: true, data: risque });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/risques/:id — RESPONSABLE_QHSE
const updateRisque = async (req, res) => {
  try {
    const risque = await risqueService.updateRisque(req.params.id, req.body, req.user.userId, req.user.entrepriseId);
    res.status(200).json({ success: true, data: risque });
  } catch (error) {
    handleErreur(res, error);
  }
};

// DELETE /api/risques/:id — RESPONSABLE_QHSE
const deleteRisque = async (req, res) => {
  try {
    await risqueService.deleteRisque(req.params.id, req.user.entrepriseId);
    res.status(200).json({ success: true, message: "Risque supprimé." });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/risques/:id/generer-action — RESPONSABLE_QHSE
const genererAction = async (req, res) => {
  try {
    const action = await risqueService.genererActionDepuisRisque(req.params.id, req.user.userId, req.user.entrepriseId, req.body);
    res.status(201).json({ success: true, data: action });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/risques/:id/historique — piste d'audit en lecture seule
const getHistoriqueRisque = async (req, res) => {
  try {
    const historique = await risqueService.getHistoriqueByRisque(req.params.id, req.user.entrepriseId);
    res.status(200).json({ success: true, data: historique });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/risques/statut-revision — échéance de révision annuelle du DUERP
const getStatutRevision = async (req, res) => {
  try {
    const statut = await risqueService.getStatutRevision(req.user.entrepriseId);
    res.status(200).json({ success: true, data: statut });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/risques/marquer-revise — RESPONSABLE_QHSE marque le DUERP comme révisé
const marquerRevise = async (req, res) => {
  try {
    const statut = await risqueService.marquerRevise(req.user.entrepriseId);
    res.status(200).json({ success: true, data: statut });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/risques/rapport-pdf — registre DUERP complet (RESPONSABLE_QHSE, ADMIN)
const genererRapportPdf = async (req, res) => {
  try {
    const { entrepriseId } = req.user;
    const { siteId } = req.query;
    const { doc, filename } = await genererRapportRegistre(entrepriseId, { siteId });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = {
  getAllRisques, getMatrice, getRisqueById,
  createRisque, updateRisque, deleteRisque, genererAction,
  getHistoriqueRisque, getStatutRevision, marquerRevise,
  genererRapportPdf,
};
