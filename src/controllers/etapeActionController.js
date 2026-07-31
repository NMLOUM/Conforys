const etapeActionService = require("../services/etapeActionService");
const { handleErreur } = require("../utils/handleErreur");

const demandeurDepuis = (req) => ({ userId: req.user.userId, role: req.user.role });

// GET /api/actions/:id/etapes
const getEtapes = async (req, res) => {
  try {
    const etapes = await etapeActionService.getEtapesByAction(
      req.params.id, req.user.entrepriseId, demandeurDepuis(req)
    );
    res.status(200).json({ success: true, data: etapes });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/actions/:id/etapes
const ajouterEtape = async (req, res) => {
  try {
    const etape = await etapeActionService.ajouterEtape(
      req.params.id, req.body.libelle, req.user.entrepriseId, demandeurDepuis(req)
    );
    res.status(201).json({ success: true, data: etape });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/actions/:id/etapes/:etapeId
const modifierEtape = async (req, res) => {
  try {
    const etape = await etapeActionService.modifierEtape(
      req.params.id, req.params.etapeId, req.body, req.user.entrepriseId, demandeurDepuis(req)
    );
    res.status(200).json({ success: true, data: etape });
  } catch (error) {
    handleErreur(res, error);
  }
};

// DELETE /api/actions/:id/etapes/:etapeId
const supprimerEtape = async (req, res) => {
  try {
    await etapeActionService.supprimerEtape(
      req.params.id, req.params.etapeId, req.user.entrepriseId, demandeurDepuis(req)
    );
    res.status(200).json({ success: true, message: "Étape supprimée." });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getEtapes, ajouterEtape, modifierEtape, supprimerEtape };
