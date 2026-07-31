const express = require("express");
const router = express.Router();
const { deletePieceJointe } = require("../controllers/pieceJointeActionController");
const { protect } = require("../middlewares/authMiddleware");

// Suppression → RESPONSABLE_QHSE/ADMIN ou l'auteur de la pièce jointe
// (le detail est vérifié dans le service, qui connaît l'auteur réel)
router.delete("/:id", protect, deletePieceJointe);

module.exports = router;
