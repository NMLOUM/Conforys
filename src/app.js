// Importation d'Express (le framework de l'API)
const express = require("express");
// Importation de CORS (autorise les requêtes du frontend React)
const cors = require("cors");
// Importation des routes Utilisateurs
const userRoutes = require("./routes/userRoutes");
// Importation des routes d'authentification
const authRoutes = require("./routes/authRoutes");
// Importation des routes Entreprises
const entrepriseRoutes = require("./routes/entrepriseRoutes");
// Importation des routes Incidents
const incidentRoutes = require("./routes/incidentsRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const epiRoutes = require("./routes/epiRoutes");
const auditRoutes        = require("./routes/auditRoutes");
// Importation des routes Formations
const formationRoutes    = require("./routes/formationRoutes");
// Importation des routes Habilitations
const habilitationRoutes = require("./routes/habilitationRoutes");
const siteRoutes         = require("./routes/siteRoutes");
const actionsRoutes         = require("./routes/actionsRoutes");
const piecesJointesRoutes   = require("./routes/piecesJointesRoutes");
const rapportRoutes         = require("./routes/rapportRoutes");
const notificationRoutes    = require("./routes/notificationRoutes");
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

// Branchement des routes d'authentification (commencent par /api/auth)
app.use("/api/auth", authRoutes);
// Branchement des routes Utilisateurs (commencent par /api/users)
app.use("/api/users", userRoutes);
// Branchement des routes Entreprises (commencent par /api/entreprises)
app.use("/api/entreprises", entrepriseRoutes);
// Branchement des routes Incidents (commencent par /api/incidents)
app.use("/api/incidents", incidentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/epis", epiRoutes);
app.use("/api/audits", auditRoutes);
// Branchement des routes Formations (commencent par /api/formations)
app.use("/api/formations", formationRoutes);
// Branchement des routes Habilitations (commencent par /api/habilitations)
app.use("/api/habilitations", habilitationRoutes);
app.use("/api/sites",        siteRoutes);
app.use("/api/actions",         actionsRoutes);
app.use("/api/pieces-jointes",  piecesJointesRoutes);
app.use("/api/rapports",        rapportRoutes);
app.use("/api/notifications",   notificationRoutes);
// Export de l'application pour le démarrage dans server.js
module.exports = app;