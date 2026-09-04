const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/assistantController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }  = require("../middlewares/validate");
const { chatSchema } = require("../validators/assistantValidator");

// POST /api/assistant/chat — réservé à ADMIN et RESPONSABLE_QHSE
router.post("/chat", protect, authorize("ADMIN", "RESPONSABLE_QHSE"), validate(chatSchema), chat);

module.exports = router;
