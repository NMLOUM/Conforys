const express = require("express");
const router = express.Router();
const {
  getAllIncidents, getIncidentById,
  createIncident, updateIncident, deleteIncident,
} = require("../controllers/incidentsController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }  = require("../middlewares/validate");
const { incidentSchema } = require("../validators/incidentValidator");

// Lecture  →  tous les rôles (tout le monde peut consulter)
router.get("/",    protect, getAllIncidents);
router.get("/:id", protect, getIncidentById);

// Déclaration  →  tous les rôles (tout le monde peut déclarer un incident)
router.post("/", protect, validate(incidentSchema), createIncident);

// Modification/validation  →  ADMIN et RESPONSABLE_QHSE
router.put("/:id", protect, authorize("ADMIN", "RESPONSABLE_QHSE"), updateIncident);

// Suppression  →  ADMIN uniquement
router.delete("/:id", protect, authorize("ADMIN"), deleteIncident);

module.exports = router;
