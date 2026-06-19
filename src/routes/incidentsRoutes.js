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

// Lecture  →  tous les rôles authentifiés
router.get("/",    protect, getAllIncidents);
router.get("/:id", protect, getIncidentById);

// Déclaration  →  tous les rôles authentifiés
router.post("/", protect, validate(incidentSchema), createIncident);

// Modification générique  →  ADMIN et RESPONSABLE_QHSE
router.put("/:id", protect, authorize("ADMIN", "RESPONSABLE_QHSE"), updateIncident);

// Suppression  →  ADMIN uniquement
router.delete("/:id", protect, authorize("ADMIN"), deleteIncident);

// ── Workflow de statuts ────────────────────────────────────────────────────────
// BROUILLON → OUVERT : le déclarant soumet son incident (la vérification se fait dans le service)
router.put("/:id/soumettre", protect, soumettre);

// OUVERT → EN_COURS : QHSE/ADMIN valide (le service vérifie qu'il n'est pas le déclarant)
router.put("/:id/valider",  protect, authorize("ADMIN", "RESPONSABLE_QHSE"), valider);

// OUVERT → REJETE : QHSE/ADMIN rejette
router.put("/:id/rejeter",  protect, authorize("ADMIN", "RESPONSABLE_QHSE"), rejeter);

// EN_COURS → CLOS : QHSE/ADMIN clôture (dateCloture remplie automatiquement)
router.put("/:id/cloturer", protect, authorize("ADMIN", "RESPONSABLE_QHSE"), cloturer);

module.exports = router;
