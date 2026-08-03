// Espace collaboratif d'un incident : fil de discussion en lecture/écriture
// pour toute personne ayant accès à l'incident (déclarant, assigné, QHSE, ADMIN).
const prisma = require("../config/prisma");
const { peutAccederIncident } = require("./incidentService");

class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const INCLUDE_COMMENTAIRE = {
  auteur: { select: { id: true, nom: true, prenom: true } },
};

// Vérifie que l'incident existe, appartient à l'entreprise du demandeur, et
// que ce dernier a le droit d'y accéder (déclarant/assigné pour un EMPLOYE) —
// sinon "Incident introuvable", sans distinguer les deux cas.
const verifierAcces = async (incidentId, entrepriseId, demandeur) => {
  const incident = await prisma.incident.findFirst({ where: { id: incidentId, declarePar: { entrepriseId } } });
  if (!incident || !peutAccederIncident(incident, demandeur)) {
    throw new ErreurMetier("Incident introuvable.", 404);
  }
  return incident;
};

// Liste les commentaires d'un incident, du plus ancien au plus récent (ordre
// naturel d'un fil de discussion)
const getCommentairesByIncident = async (incidentId, entrepriseId, demandeur) => {
  await verifierAcces(incidentId, entrepriseId, demandeur);
  return await prisma.commentaire.findMany({
    where: { incidentId },
    include: INCLUDE_COMMENTAIRE,
    orderBy: { createdAt: "asc" },
  });
};

// Ajoute un commentaire à un incident
const addCommentaire = async (incidentId, data, auteurId, entrepriseId, demandeur) => {
  await verifierAcces(incidentId, entrepriseId, demandeur);

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
