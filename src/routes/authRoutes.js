// Importation d'Express et de son routeur
const express = require("express");
const router = express.Router();
// Importation de la fonction login du contrôleur d'authentification
const { login } = require("../controllers/authController");

// POST /api/auth/login  →  connexion de l'utilisateur
router.post("/login", login);

// Export du routeur pour le brancher dans app.js
module.exports = router;