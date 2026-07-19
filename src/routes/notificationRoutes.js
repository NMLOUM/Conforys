const express = require("express");
const router = express.Router();
const {
  getMesNotifications, getCompteurNonLues,
  marquerLu, marquerToutLu, getAlertes,
} = require("../controllers/notificationController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// Notifications personnelles — tous les rôles authentifiés
router.get("/",               protect, getMesNotifications);
router.get("/non-lues/count", protect, getCompteurNonLues);
router.put("/tout-lu",        protect, marquerToutLu);
router.put("/:id/lu",         protect, marquerLu);

// Alertes métier — réservées au pilotage QHSE
router.get("/alertes", protect, authorize("RESPONSABLE_QHSE", "ADMIN"), getAlertes);

module.exports = router;
