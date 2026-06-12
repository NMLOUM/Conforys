// Importation du service Dashboard (la logique de calcul des stats)
const dashboardService = require("../services/dashboardService");

// Récupère les statistiques des incidents pour le tableau de bord
const getIncidentStats = async (req, res) => {
  try {
    const stats = await dashboardService.getIncidentStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export du contrôleur
module.exports = { getIncidentStats };