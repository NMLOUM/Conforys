const notificationService = require("../services/notificationService");
const { handleErreur } = require("../utils/handleErreur");

// GET /api/notifications — mes notifications, les plus récentes d'abord
const getMesNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getByUser(req.user.userId);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/notifications/non-lues/count — alimente le badge de la cloche
const getCompteurNonLues = async (req, res) => {
  try {
    const count = await notificationService.compterNonLues(req.user.userId);
    res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/notifications/:id/lu
const marquerLu = async (req, res) => {
  try {
    const notification = await notificationService.marquerLu(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    handleErreur(res, error);
  }
};

// PUT /api/notifications/tout-lu
const marquerToutLu = async (req, res) => {
  try {
    await notificationService.marquerToutLu(req.user.userId);
    res.status(200).json({ success: true, message: "Toutes les notifications ont été marquées comme lues." });
  } catch (error) {
    handleErreur(res, error);
  }
};

// GET /api/notifications/alertes — alertes métier calculées à la volée (QHSE/ADMIN)
const getAlertes = async (req, res) => {
  try {
    const alertes = await notificationService.getAlertesMetier(req.user.entrepriseId);
    res.status(200).json({ success: true, data: alertes });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = {
  getMesNotifications,
  getCompteurNonLues,
  marquerLu,
  marquerToutLu,
  getAlertes,
};
