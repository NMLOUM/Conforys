const assistantService = require("../services/assistantService");
const { handleErreur } = require("../utils/handleErreur");

// POST /api/assistant/chat — question posée à l'assistant IA.
// entrepriseId vient exclusivement du token JWT (req.user), jamais du corps
// de la requête : un client ne peut pas interroger les données d'une autre
// entreprise en falsifiant son payload (isolation multi-tenant).
const chat = async (req, res) => {
  try {
    const { question } = req.body;
    const reponse = await assistantService.poserQuestion(question, req.user.entrepriseId);
    res.status(200).json({ success: true, reponse });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { chat };
