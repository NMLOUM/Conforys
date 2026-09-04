// Script de test rapide : verifie que la cle API Anthropic fonctionne en
// envoyant une question simple a Claude et en affichant la reponse.
require("dotenv/config");
const Anthropic = require("@anthropic-ai/sdk");

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY manquante. Ajoutez-la dans votre fichier .env.");
    process.exit(1);
  }

  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    messages: [
      { role: "user", content: "Reponds en une phrase : quelle est la capitale du Senegal ?" },
    ],
  });

  const texte = response.content.find((b) => b.type === "text")?.text ?? "(pas de texte)";
  console.log("✅ Cle API valide. Reponse de Claude :\n");
  console.log(texte);
}

main().catch((err) => {
  console.error("❌ Erreur lors de l'appel a l'API Anthropic :", err.message || err);
  process.exit(1);
});
