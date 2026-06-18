const siteService = require("../services/siteService");

const getAllSites = async (req, res) => {
  try {
    const sites = await siteService.getAllSites();
    res.json({ success: true, data: sites });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getAllSites };
