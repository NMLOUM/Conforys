const express = require("express");
const router = express.Router();
const {
  getAllIncidents, getIncidentById,
  createIncident, updateIncident, deleteIncident,
  soumettre, valider, rejeter, cloturer,
} = require("../controllers/incidentsController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }  = require("../middlewares/validate");
const { incidentSchema } = require("../validators/incidentValidator");
const { getActionsByIncident, createAction } = require("../controllers/actionController");
const { actionSchema } = require("../validators/actionValidator");
const { getPiecesByIncident, addPieceJointe } = require("../controllers/pieceJointeController");
const { pieceJointeSchema } = require("../validators/pieceJointeValidator");

// Lecture  →  tous les rôles authentifiés
router.get("/",    protect, getAllIncidents);
router.get("/:id", protect, getIncidentById);

// Déclaration  →  tous les rôles authentifiés
router.post("/", protect, validate(incidentSchema), createIncident);

// Modification générique  →  RESPONSABLE_QHSE uniquement (mise à jour de champs hors workflow)
router.put("/:id", protect, authorize("RESPONSABLE_QHSE"), updateIncident);

// Suppression  →  ADMIN uniquement (maintenance technique)
router.delete("/:id", protect, authorize("ADMIN"), deleteIncident);

// ── Workflow de statuts ────────────────────────────────────────────────────────
// BROUILLON → OUVERT : le déclarant soumet son incident
router.put("/:id/soumettre", protect, soumettre);

// OUVERT → EN_COURS : RESPONSABLE_QHSE valide (territoire métier QHSE exclusif)
router.put("/:id/valider",  protect, authorize("RESPONSABLE_QHSE"), valider);

// OUVERT → REJETE : RESPONSABLE_QHSE rejette
router.put("/:id/rejeter",  protect, authorize("RESPONSABLE_QHSE"), rejeter);

// EN_COURS → CLOS : RESPONSABLE_QHSE clôture
router.put("/:id/cloturer", protect, authorize("RESPONSABLE_QHSE"), cloturer);

// ── Actions correctives (CAPA) ─────────────────────────────────────────────
// GET  /api/incidents/:id/actions → liste des actions d'un incident (tous)
router.get("/:id/actions", protect, getActionsByIncident);

// POST /api/incidents/:id/actions → créer une action (RESPONSABLE_QHSE uniquement)
router.post(
  "/:id/actions",
  protect,
  authorize("RESPONSABLE_QHSE"),
  validate(actionSchema),
  createAction
);

// ── Pièces jointes ────────────────────────────────────────────────────────────
// GET  /api/incidents/:id/pieces-jointes → liste des pièces jointes d'un incident
router.get("/:id/pieces-jointes", protect, getPiecesByIncident);

// POST /api/incidents/:id/pieces-jointes → enregistrer une pièce jointe (URL déjà uploadée)
router.post(
  "/:id/pieces-jointes",
  protect,
  validate(pieceJointeSchema),
  addPieceJointe
);

module.exports = router;
