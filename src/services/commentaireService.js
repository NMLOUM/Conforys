// Espace collaboratif d'un incident : fil de discussion en lecture/écriture
// pour toute personne ayant accès à l'incident (déclarant, QHSE, ADMIN).
const prisma = require("../config/prisma");

class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const INCLUDE_COMMENTAIRE = {
  auteur: { select: { id: true, nom: true, prenom: true } },
};

// Liste les commentaires d'un incident, du plus ancien au plus récent (ordre
// naturel d'un fil de discussion)
const getCommentairesByIncident = async (incidentId, entrepriseId) => {
  return await prisma.commentaire.findMany({
    where: { incidentId, incident: { declarePar: { entrepriseId } } },
    include: INCLUDE_COMMENTAIRE,
    orderBy: { createdAt: "asc" },
  });
};

// Ajoute un commentaire à un incident
const addCommentaire = async (incidentId, data, auteurId, entrepriseId) => {
  const incident = await prisma.incident.findFirst({ where: { id: incidentId, declarePar: { entrepriseId } } });
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);

  return await prisma.commentaire.create({
    data: {
      contenu: data.contenu.trim(),
      incidentId,
      auteurId,
    },
    include: INCLUDE_COMMENTAIRE,
  });
};

module.exports = { getCommentairesByIncident, addCommentaire };
