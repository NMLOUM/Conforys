// Importation du service Dashboard (la logique de calcul des stats)
const dashboardService = require("../services/dashboardService");
const { handleErreur } = require("../utils/handleErreur");

const getIncidentStats = async (req, res) => {
  try {
    const stats = await dashboardService.getIncidentStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    handleErreur(res, error);
  }
};

// Export du contrôleur
module.exports = { getIncidentStats };