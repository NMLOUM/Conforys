const prisma = require("../config/prisma");
const { enregistrer } = require("./historiqueService");

// Erreur métier avec code HTTP (400/404) — évite de renvoyer 500 sur des cas attendus
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Récupère toutes les pièces jointes d'un incident, triées par date d'ajout
const getPiecesByIncident = async (incidentId, entrepriseId) => {
  return await prisma.pieceJointe.findMany({
    where: { incidentId, incident: { declarePar: { entrepriseId } } },
    orderBy: { dateAjout: "desc" },
  });
};

// Enregistre une pièce jointe (l'URL ImgBB est fournie déjà uploadée depuis le frontend)
const addPieceJointe = async (incidentId, data, auteurId, entrepriseId) => {
  const incident = await prisma.incident.findFirst({ where: { id: incidentId, declarePar: { entrepriseId } } });
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);

  const piece = await prisma.pieceJointe.create({
    data: {
      url:       data.url,
      nom:       data.nom  || null,
      type:      data.type || "IMAGE",
      incidentId,
    },
  });
  await enregistrer(incidentId, auteurId, "Photo ajoutée", data.nom || "sans nom");
  return piece;
};

// Supprime une pièce jointe (le fichier distant sur ImgBB n'est pas supprimé —
// ImgBB ne fournit pas d'API de suppression publique sans clé de suppression)
const deletePieceJointe = async (id, entrepriseId) => {
  const piece = await prisma.pieceJointe.findFirst({ where: { id, incident: { declarePar: { entrepriseId } } } });
  if (!piece) throw new ErreurMetier("Pièce jointe introuvable.", 404);
  return await prisma.pieceJointe.delete({ where: { id } });
};

module.exports = { getPiecesByIncident, addPieceJointe, deletePieceJointe };
