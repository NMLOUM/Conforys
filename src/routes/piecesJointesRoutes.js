const express = require("express");
const router = express.Router();
const { deletePieceJointe } = require("../controllers/pieceJointeController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// Suppression → RESPONSABLE_QHSE uniquement
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deletePieceJointe);

module.exports = router;
