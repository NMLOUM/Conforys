const siteService = require("../services/siteService");
const { handleErreur } = require("../utils/handleErreur");

const getAllSites = async (req, res) => {
  try {
    const sites = await siteService.getAllSites(req.user.entrepriseId);
    res.json({ success: true, data: sites });
  } catch (error) {
    handleErreur(res, error);
  }
};

module.exports = { getAllSites };
