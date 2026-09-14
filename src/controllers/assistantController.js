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
    await assistantService.enregistrerHistorique(req.user, question, reponse);
    res.status(200).json({ success: true, reponse });
  } catch (error) {
    handleErreur(res, error);
  }
};

const historique = async (req, res) => {
  try {
    const donnees = await assistantService.getHistorique(req.user);
    res.status(200).json({ success: true, data: donnees });
  } catch (error) {
    handleErreur(res, error);
  }
};

const suggestionRisque = async (req, res) => {
  try {
    const suggestion = await assistantService.suggererMesuresRisque(req.body);
    res.status(200).json({ success: true, suggestion });
  } catch (error) {
    handleErreur(res, error);
  }
};

const suggestionContexte = async (req, res) => {
  try {
    const suggestion = await assistantService.suggererDepuisContexte(req.body);
    res.status(200).json({ success: true, suggestion });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { chat, historique, suggestionRisque, suggestionContexte };
