// Importation d'Express (le framework de l'API)
const express = require("express");
// Importation de CORS (autorise les requêtes du frontend React)
const cors = require("cors");
// Importation des routes Utilisateurs
const userRoutes = require("./routes/userRoutes");

// Création de l'application Express
const app = express();

// Middleware : autorise les requêtes venant d'autres origines (le frontend)
app.use(cors());
// Middleware : permet de lire le JSON envoyé dans les requêtes
app.use(express.json());

// Route de santé : vérifie que l'API fonctionne
app.get("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "L'API CONFORYS fonctionne correctement.",
    timestamp: new Date().toISOString(),
  });
});

// Branchement des routes Utilisateurs (toutes commencent par /api/users)
app.use("/api/users", userRoutes);

// Export de l'application pour le démarrage dans server.js
module.exports = app;