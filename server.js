require("dotenv/config");
const app = require("./src/app");
const prisma = require("./src/config/prisma");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Connexion à la base de données réussie");

    app.listen(PORT, () => {
      console.log(`✅ Serveur CONFORYS démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Erreur de connexion à la base :", error);
    process.exit(1);
  }
}

startServer();