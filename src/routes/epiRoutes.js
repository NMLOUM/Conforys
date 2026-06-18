const express = require("express");
const router = express.Router();
const {
  getAllEpis, getEpisEnAlerte, getEpiById,
  createEpi, updateEpi, deleteEpi,
} = require("../controllers/epiController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// ⚠️ Route spécifique placée avant /:id pour éviter le conflit
// Lecture  →  tous les rôles
router.get("/alertes", protect, getEpisEnAlerte);
router.get("/",        protect, getAllEpis);
router.get("/:id",     protect, getEpiById);

// Écritures  →  ADMIN et RESPONSABLE_QHSE
router.post("/",      protect, authorize("ADMIN", "RESPONSABLE_QHSE"), createEpi);
router.put("/:id",    protect, authorize("ADMIN", "RESPONSABLE_QHSE"), updateEpi);
router.delete("/:id", protect, authorize("ADMIN", "RESPONSABLE_QHSE"), deleteEpi);

module.exports = router;
