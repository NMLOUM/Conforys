const commentaireService = require("../services/commentaireService");
const { handleErreur } = require("../utils/handleErreur");

// GET /api/incidents/:id/commentaires
const getCommentaires = async (req, res) => {
  try {
    const demandeur = { userId: req.user.userId, role: req.user.role };
    const commentaires = await commentaireService.getCommentairesByIncident(req.params.id, req.user.entrepriseId, demandeur);
    res.status(200).json({ success: true, data: commentaires });
  } catch (error) {
    handleErreur(res, error);
  }
};

// POST /api/incidents/:id/commentaires
const addCommentaire = async (req, res) => {
  try {
    const demandeur = { userId: req.user.userId, role: req.user.role };
    const commentaire = await commentaireService.addCommentaire(req.params.id, req.body, req.user.userId, req.user.entrepriseId, demandeur);
    res.status(201).json({ success: true, data: commentaire });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getCommentaires, addCommentaire };
