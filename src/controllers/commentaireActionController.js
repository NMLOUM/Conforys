const commentaireActionService = require("../services/commentaireActionService");
const { handleErreur } = require("../utils/handleErreur");

const demandeurDepuis = (req) => ({ userId: req.user.userId, role: req.user.role });

// GET /api/actions/:id/commentaires
const getCommentaires = async (req, res) => {
  try {
    const commentaires = await commentaireActionService.getCommentairesByAction(
      req.params.id, req.user.entrepriseId, demandeurDepuis(req)
    );
    res.status(200).json({ success: true, data: commentaires });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/actions/:id/commentaires
const addCommentaire = async (req, res) => {
  try {
    const commentaire = await commentaireActionService.addCommentaire(
      req.params.id, req.body, req.user.userId, req.user.entrepriseId, demandeurDepuis(req)
    );
    res.status(201).json({ success: true, data: commentaire });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getCommentaires, addCommentaire };
