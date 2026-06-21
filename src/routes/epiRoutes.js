const express = require("express");
const router = express.Router();
const {
  getAllEpis, getEpisEnAlerte, getEpiById,
  createEpi, updateEpi, deleteEpi,
} = require("../controllers/epiController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { validate }  = require("../middlewares/validate");
const { epiSchema } = require("../validators/epiValidator");

// ⚠️ Route spécifique placée avant /:id pour éviter le conflit
// Lecture  →  tous les rôles
router.get("/alertes", protect, getEpisEnAlerte);
router.get("/",        protect, getAllEpis);
router.get("/:id",     protect, getEpiById);

// Écritures  →  RESPONSABLE_QHSE uniquement (l'ADMIN gère les utilisateurs/sites, pas le métier QHSE)
router.post("/",      protect, authorize("RESPONSABLE_QHSE"), validate(epiSchema), createEpi);
router.put("/:id",    protect, authorize("RESPONSABLE_QHSE"), updateEpi);
router.delete("/:id", protect, authorize("RESPONSABLE_QHSE"), deleteEpi);

module.exports = router;
