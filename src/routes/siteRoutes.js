const { Router } = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { getAllSites } = require("../controllers/siteController");

const router = Router();
router.get("/", protect, getAllSites);

module.exports = router;
