const express = require("express");
const router = express.Router();
const {
  getAllModules, getModuleById, completerLecon, soumettreQuiz, getMaProgression,
} = require("../controllers/moduleFormationController");
const { protect }  = require("../middlewares/authMiddleware");
const { validate } = require("../middlewares/validate");
const { soumettreQuizSchema } = require("../validators/moduleFormationValidator");

// Consultation et progression — tous rôles (auto-formation individuelle,
// pas d'action réservée au RESPONSABLE_QHSE ici : chacun gère son propre parcours)
router.get("/",    protect, getAllModules);
router.get("/:id", protect, getModuleById);
router.get("/:id/ma-progression", protect, getMaProgression);
router.put("/:id/lecons/:leconId/completer", protect, completerLecon);
router.post("/:id/quiz/soumettre", protect, validate(soumettreQuizSchema), soumettreQuiz);

module.exports = router;
