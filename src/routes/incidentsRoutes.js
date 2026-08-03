const express = require("express");
const router = express.Router();
const {
  getAllIncidents, getIncidentById,
  createIncident, updateIncident, deleteIncident,
  soumettre, valider, rejeter, cloturer,
  genererRapportPdf,
} = require("../controllers/incidentsController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate, validateQuery } = require("../middlewares/validate");
const { incidentSchema, updateIncidentSchema, listeIncidentsSchema, rejeterIncidentSchema, validerIncidentSchema } = require("../validators/incidentValidator");
const { getActionsByIncident, createAction } = require("../controllers/actionController");
const { actionSchema } = require("../validators/actionValidator");
const { getPiecesByIncident, addPieceJointe } = require("../controllers/pieceJointeController");
const { pieceJointeSchema } = require("../validators/pieceJointeValidator");
const { getCommentaires, addCommentaire } = require("../controllers/commentaireController");
const { commentaireSchema } = require("../validators/commentaireValidator");
const { getHistorique } = require("../controllers/historiqueController");
const {
  getAnalyse, initialiserAnalyse, updateAnalyse, genererActionDepuisAnalyse,
} = require("../controllers/analyseCausesController");
const { updateAnalyseSchema } = require("../validators/analyseCausesValidator");

// Lecture  →  tous les rôles authentifiés
router.get("/",    protect, validateQuery(listeIncidentsSchema), getAllIncidents);
router.get("/:id", protect, getIncidentById);

// Rapport PDF  →  RESPONSABLE_QHSE et ADMIN uniquement
router.get("/:id/rapport-pdf", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), genererRapportPdf);

// Déclaration  →  tous les rôles authentifiés
router.post("/", protect, validate(incidentSchema), createIncident);

// Modification générique  →  RESPONSABLE_QHSE uniquement (mise à jour de champs hors workflow)
router.put("/:id", protect, authorize("RESPONSABLE_QHSE"), validate(updateIncidentSchema), updateIncident);

// Suppression  →  ADMIN uniquement (maintenance technique)
router.delete("/:id", protect, authorize("ADMIN"), deleteIncident);

// ── Workflow de statuts ────────────────────────────────────────────────────────
// BROUILLON → OUVERT : le déclarant soumet son incident
router.put("/:id/soumettre", protect, soumettre);

// OUVERT → EN_COURS : RESPONSABLE_QHSE valide et assigne un employé pour le
// traitement dans le même geste (territoire métier QHSE exclusif)
router.put("/:id/valider",  protect, authorize("RESPONSABLE_QHSE"), validate(validerIncidentSchema), valider);

// OUVERT → REJETE : RESPONSABLE_QHSE rejette
router.put("/:id/rejeter",  protect, authorize("RESPONSABLE_QHSE"), validate(rejeterIncidentSchema), rejeter);

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

// ── Piste d'audit (lecture seule — pas de PUT/DELETE) ─────────────────────────
router.get("/:id/historique", protect, getHistorique);

// ── Analyse des causes racines (5 Pourquoi + Ishikawa 5M) ─────────────────────
// GET  /api/incidents/:id/analyse → lecture (tous les rôles ayant accès à l'incident)
router.get("/:id/analyse", protect, getAnalyse);

// POST /api/incidents/:id/analyse → initialise l'analyse (RESPONSABLE_QHSE)
router.post("/:id/analyse", protect, authorize("RESPONSABLE_QHSE"), initialiserAnalyse);

// PUT  /api/incidents/:id/analyse → met à jour l'analyse (RESPONSABLE_QHSE)
router.put("/:id/analyse", protect, authorize("RESPONSABLE_QHSE"), validate(updateAnalyseSchema), updateAnalyse);

// POST /api/incidents/:id/analyse/action → génère une action corrective depuis la cause racine (RESPONSABLE_QHSE)
router.post("/:id/analyse/action", protect, authorize("RESPONSABLE_QHSE"), genererActionDepuisAnalyse);

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

// ── Commentaires (espace collaboratif) ────────────────────────────────────────
// GET  /api/incidents/:id/commentaires → fil de discussion (tous les rôles ayant accès à l'incident)
router.get("/:id/commentaires", protect, getCommentaires);

// POST /api/incidents/:id/commentaires → ajouter un commentaire
router.post("/:id/commentaires", protect, validate(commentaireSchema), addCommentaire);

module.exports = router;
