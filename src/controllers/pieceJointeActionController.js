const pieceJointeActionService = require("../services/pieceJointeActionService");
const { handleErreur } = require("../utils/handleErreur");

const demandeurDepuis = (req) => ({ userId: req.user.userId, role: req.user.role });

// GET /api/actions/:id/pieces-jointes
const getPiecesByAction = async (req, res) => {
  try {
    const pieces = await pieceJointeActionService.getPiecesByAction(
      req.params.id, req.user.entrepriseId, demandeurDepuis(req)
    );
    res.status(200).json({ success: true, data: pieces });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/actions/:id/pieces-jointes
const addPieceJointe = async (req, res) => {
  try {
    const piece = await pieceJointeActionService.addPieceJointe(
      req.params.id, req.body, req.user.userId, req.user.entrepriseId, demandeurDepuis(req)
    );
    res.status(201).json({ success: true, data: piece });
  } catch (error) {
    handleErreur(res, error);
  }
};

// DELETE /api/pieces-jointes-action/:id
const deletePieceJointe = async (req, res) => {
  try {
    await pieceJointeActionService.deletePieceJointe(req.params.id, req.user.entrepriseId, demandeurDepuis(req));
    res.status(200).json({ success: true, message: "Pièce jointe supprimée." });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getPiecesByAction, addPieceJointe, deletePieceJointe };
