const express = require("express");
const router = express.Router();
const {
  getAllActions,
  getMesActions,
  getActionById,
  updateAction,
  cloturerAction,
  progresserAction,
  deleteAction,
} = require("../controllers/actionController");
const {
  getEtapes, ajouterEtape, modifierEtape, supprimerEtape,
} = require("../controllers/etapeActionController");
const { getCommentaires, addCommentaire } = require("../controllers/commentaireActionController");
const { getPiecesByAction, addPieceJointe } = require("../controllers/pieceJointeActionController");
const { getHistoriqueAction } = require("../controllers/historiqueController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }  = require("../middlewares/validate");
const { updateActionSchema, cloturerActionSchema } = require("../validators/actionValidator");
const { ajouterEtapeSchema, modifierEtapeSchema } = require("../validators/etapeActionValidator");
const { commentaireActionSchema } = require("../validators/commentaireActionValidator");
const { pieceJointeActionSchema } = require("../validators/pieceJointeActionValidator");

// GET /api/actions/mes-actions — actions assignées au connecté (tous rôles)
// DOIT être déclaré avant GET /:id pour ne pas être capturé comme un id
router.get("/mes-actions", protect, getMesActions);

// GET /api/actions — vue globale (RESPONSABLE_QHSE uniquement, scopée par entreprise)
router.get("/", protect, authorize("RESPONSABLE_QHSE"), getAllActions);

// GET /api/actions/:id — détail (page CAPA) — QHSE/ADMIN ou le responsable assigné, vérifié dans le service
router.get("/:id", protect, getActionById);

// Démarrer une action (responsable uniquement) — tous rôles, guard dans le service
router.put("/:id/progresser", protect, progresserAction);

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

// ── Page de détail CAPA : checklist, journal d'audit, commentaires, pièces jointes ──
// Accès (lecture ET écriture) vérifié dans chaque service : QHSE/ADMIN ou le
// responsable assigné à l'action — pas de restriction de rôle ici.

// Checklist des étapes de résolution
router.get("/:id/etapes", protect, getEtapes);
router.post("/:id/etapes", protect, validate(ajouterEtapeSchema), ajouterEtape);
router.put("/:id/etapes/:etapeId", protect, validate(modifierEtapeSchema), modifierEtape);
router.delete("/:id/etapes/:etapeId", protect, supprimerEtape);

// Journal d'audit (lecture seule, immuable)
router.get("/:id/historique", protect, getHistoriqueAction);

// Commentaires (espace collaboratif CAPA)
router.get("/:id/commentaires", protect, getCommentaires);
router.post("/:id/commentaires", protect, validate(commentaireActionSchema), addCommentaire);

// Pièces jointes (URL déjà uploadée côté frontend, ex: ImgBB)
router.get("/:id/pieces-jointes", protect, getPiecesByAction);
router.post("/:id/pieces-jointes", protect, validate(pieceJointeActionSchema), addPieceJointe);

module.exports = router;
