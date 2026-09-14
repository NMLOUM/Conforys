// Script de test rapide : vérifie que la clé API Gemini fonctionne.
require("dotenv/config");
const { GoogleGenAI } = require("@google/genai");

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY manquante. Ajoutez-la dans votre fichier .env.");
    process.exit(1);
  }

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    contents: "Réponds en une phrase : quelle est la capitale du Sénégal ?",
  });

  const texte = response.text ?? "(pas de texte)";
  console.log("✅ Clé API Gemini valide. Réponse :\n");
  console.log(texte);
}

main().catch((err) => {
  console.error("❌ Erreur lors de l'appel à l'API Gemini :", err.message || err);
  process.exit(1);
});
