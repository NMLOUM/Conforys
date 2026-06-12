// Importation d'Express et de son routeur
const express = require("express");
const router = express.Router();
// Importation des fonctions du contrôleur Utilisateurs
const { getAllUsers, createUser } = require("../controllers/userController");
// Importation du middleware de protection
const { protect } = require("../middlewares/authMiddleware");

// GET /api/users  →  liste tous les utilisateurs (PROTÉGÉ : token requis)
router.get("/", protect, getAllUsers);
// POST /api/users  →  crée un nouvel utilisateur
router.post("/", createUser);

// Export du routeur pour le brancher dans app.js
module.exports = router;