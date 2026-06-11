
require("dotenv/config");     // Charge les variables d'environnement (.env)
const app = require("./src/app");

// Port d'écoute (depuis .env ou 5000 par défaut)
const PORT = process.env.PORT || 5000;

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur CONFORYS démarré sur http://localhost:${PORT}`);
});