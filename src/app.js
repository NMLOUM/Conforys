
const express = require("express");
const cors = require("cors");

// Création de l'application Express
const app = express();

// ─── Middlewares globaux ───
app.use(cors());              // Autorise les requêtes du frontend React
app.use(express.json());      // Permet de lire le JSON envoyé dans les requêtes

// ─── Route de santé de l'API ───
app.get("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "L'API CONFORYS fonctionne correctement.",
    timestamp: new Date().toISOString(),
  });
});

// Export de l'application pour server.js
module.exports = app;