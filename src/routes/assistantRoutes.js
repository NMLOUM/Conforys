const express = require("express");
const router = express.Router();
const { chat, suggestionRisque, suggestionContexte } = require("../controllers/assistantController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }  = require("../middlewares/validate");
const { chatSchema, suggestionRisqueSchema, suggestionContexteSchema } = require("../validators/assistantValidator");

// POST /api/assistant/chat — réservé à ADMIN et RESPONSABLE_QHSE
router.post("/chat", protect, authorize("ADMIN", "RESPONSABLE_QHSE"), validate(chatSchema), chat);
router.post("/suggestion-risque", protect, authorize("ADMIN", "RESPONSABLE_QHSE"), validate(suggestionRisqueSchema), suggestionRisque);
router.post("/suggestion-contexte", protect, validate(suggestionContexteSchema), suggestionContexte);

module.exports = router;
