const prisma = require("../config/prisma");

// Erreur métier avec code HTTP (400/404) — évite de renvoyer 500 sur des cas attendus
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Récupère toutes les pièces jointes d'un incident, triées par date d'ajout
const getPiecesByIncident = async (incidentId) => {
  return await prisma.pieceJointe.findMany({
    where: { incidentId },
    orderBy: { dateAjout: "desc" },
  });
};

// Enregistre une pièce jointe (l'URL ImgBB est fournie déjà uploadée depuis le frontend)
const addPieceJointe = async (incidentId, data) => {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);

  return await prisma.pieceJointe.create({
    data: {
      url:       data.url,
      nom:       data.nom  || null,
      type:      data.type || "IMAGE",
      incidentId,
    },
  });
};

// Supprime une pièce jointe (le fichier distant sur ImgBB n'est pas supprimé —
// ImgBB ne fournit pas d'API de suppression publique sans clé de suppression)
const deletePieceJointe = async (id) => {
  const piece = await prisma.pieceJointe.findUnique({ where: { id } });
  if (!piece) throw new ErreurMetier("Pièce jointe introuvable.", 404);
  return await prisma.pieceJointe.delete({ where: { id } });
};

module.exports = { getPiecesByIncident, addPieceJointe, deletePieceJointe };
