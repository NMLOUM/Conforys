const express = require("express");
const router = express.Router();
const {
  getAllEpis, getEpisEnAlerte, getEpiById,
  createEpi, updateEpi, deleteEpi,
} = require("../controllers/epiController");
const { affecter, getAffectationsByEpi } = require("../controllers/affectationEpiController");
const { enregistrerInspection, getInspectionsByEpi } = require("../controllers/inspectionEpiController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }  = require("../middlewares/validate");
const { epiSchema } = require("../validators/epiValidator");
const { affecterSchema } = require("../validators/affectationEpiValidator");
const { inspectionSchema } = require("../validators/inspectionEpiValidator");

// ⚠️ Route spécifique placée avant /:id pour éviter le conflit
// Lecture  →  tous les rôles
router.get("/alertes", protect, getEpisEnAlerte);
router.get("/",        protect, getAllEpis);
router.get("/:id",     protect, getEpiById);

// Écritures  →  RESPONSABLE_QHSE uniquement (l'ADMIN gère les utilisateurs/sites, pas le métier QHSE)
router.post("/",      protect, authorize("RESPONSABLE_QHSE"), validate(epiSchema), createEpi);
router.put("/:id",    protect, authorize("RESPONSABLE_QHSE"), updateEpi);
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deleteEpi);

// ── Affectation aux employés ──────────────────────────────────────────────────
// Historique des affectations d'un EPI — tous les rôles
router.get("/:id/affectations", protect, getAffectationsByEpi);
// Affecter un EPI à un employé — RESPONSABLE_QHSE uniquement
router.post("/:id/affecter", protect, authorize("RESPONSABLE_QHSE"), validate(affecterSchema), affecter);

// ── Historique des inspections ────────────────────────────────────────────────
// Historique des inspections d'un EPI — tous les rôles
router.get("/:id/inspections", protect, getInspectionsByEpi);
// Enregistrer une inspection — RESPONSABLE_QHSE uniquement
router.post("/:id/inspections", protect, authorize("RESPONSABLE_QHSE"), validate(inspectionSchema), enregistrerInspection);

module.exports = router;
