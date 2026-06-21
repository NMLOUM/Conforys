const express = require("express");
const router = express.Router();
const {
  getAllActions,
  getMesActions,
  updateAction,
  cloturerAction,
  deleteAction,
} = require("../controllers/actionController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }  = require("../middlewares/validate");
const { updateActionSchema, cloturerActionSchema } = require("../validators/actionValidator");

// GET /api/actions/mes-actions — actions assignées au connecté (tous rôles)
// DOIT être déclaré avant GET /:id pour ne pas être capturé comme un id
router.get("/mes-actions", protect, getMesActions);

// GET /api/actions — vue globale (RESPONSABLE_QHSE uniquement, scopée par entreprise)
router.get("/", protect, authorize("RESPONSABLE_QHSE"), getAllActions);

// Clôture AVANT /:id (bonne pratique de précédence)
router.put(
  "/:id/cloturer",
  protect,
  authorize("RESPONSABLE_QHSE"),
  validate(cloturerActionSchema),
  cloturerAction
);

// Modification partielle (description, priorité, statut hors TERMINE, date limite, responsable)
router.put(
  "/:id",
  protect,
  authorize("RESPONSABLE_QHSE"),
  validate(updateActionSchema),
  updateAction
);

// Suppression définitive → RESPONSABLE_QHSE (métier QHSE, pas ADMIN)
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deleteAction);

module.exports = router;
