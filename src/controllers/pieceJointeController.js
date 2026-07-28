const pieceJointeService = require("../services/pieceJointeService");
const { handleErreur } = require("../utils/handleErreur");

// GET /api/incidents/:id/pieces-jointes
const getPiecesByIncident = async (req, res) => {
  try {
    const pieces = await pieceJointeService.getPiecesByIncident(req.params.id, req.user.entrepriseId);
    res.status(200).json({ success: true, data: pieces });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/incidents/:id/pieces-jointes
const addPieceJointe = async (req, res) => {
  try {
    const piece = await pieceJointeService.addPieceJointe(req.params.id, req.body, req.user.userId, req.user.entrepriseId);
    res.status(201).json({ success: true, data: piece });
  } catch (error) {
    handleErreur(res, error);
  }
};

// DELETE /api/pieces-jointes/:id
const deletePieceJointe = async (req, res) => {
  try {
    await pieceJointeService.deletePieceJointe(req.params.id, req.user.entrepriseId, {
      userId: req.user.userId,
      role: req.user.role,
    });
    res.status(200).json({ success: true, message: "Pièce jointe supprimée." });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getPiecesByIncident, addPieceJointe, deletePieceJointe };
