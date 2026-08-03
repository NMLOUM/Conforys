const prisma = require("../config/prisma");
const { enregistrer } = require("./historiqueService");
const { peutAccederIncident } = require("./incidentService");

// Erreur métier avec code HTTP (400/404) — évite de renvoyer 500 sur des cas attendus
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Include partagé : l'auteur de l'ajout, pour affichage (nom, initiales) et
// pour la vérification de propriété à la suppression
const INCLUDE_PIECE = {
  ajoutePar: { select: { id: true, nom: true, prenom: true } },
};

// Vérifie que l'incident existe, appartient à l'entreprise du demandeur, et
// que ce dernier a le droit d'y accéder (déclarant/assigné pour un EMPLOYE).
const verifierAcces = async (incidentId, entrepriseId, demandeur) => {
  const incident = await prisma.incident.findFirst({ where: { id: incidentId, declarePar: { entrepriseId } } });
  if (!incident || !peutAccederIncident(incident, demandeur)) {
    throw new ErreurMetier("Incident introuvable.", 404);
  }
  return incident;
};

// Récupère toutes les pièces jointes d'un incident, triées par date d'ajout
const getPiecesByIncident = async (incidentId, entrepriseId, demandeur) => {
  await verifierAcces(incidentId, entrepriseId, demandeur);
  return await prisma.pieceJointe.findMany({
    where: { incidentId },
    include: INCLUDE_PIECE,
    orderBy: { dateAjout: "desc" },
  });
};

// Enregistre une pièce jointe (l'URL ImgBB est fournie déjà uploadée depuis le frontend)
const addPieceJointe = async (incidentId, data, auteurId, entrepriseId, demandeur) => {
  await verifierAcces(incidentId, entrepriseId, demandeur);

  const piece = await prisma.pieceJointe.create({
    data: {
      url:         data.url,
      nom:         data.nom  || null,
      type:        data.type || "IMAGE",
      taille:      data.taille ?? null,
      incidentId,
      ajouteParId: auteurId,
    },
    include: INCLUDE_PIECE,
  });
  await enregistrer(incidentId, auteurId, "Photo ajoutée", data.nom || "sans nom");
  return piece;
};

// Supprime une pièce jointe (le fichier distant sur ImgBB n'est pas supprimé —
// ImgBB ne fournit pas d'API de suppression publique sans clé de suppression).
// Autorisé pour RESPONSABLE_QHSE/ADMIN, ou pour l'utilisateur qui l'a ajoutée.
const deletePieceJointe = async (id, entrepriseId, demandeur) => {
  const piece = await prisma.pieceJointe.findFirst({ where: { id, incident: { declarePar: { entrepriseId } } } });
  if (!piece) throw new ErreurMetier("Pièce jointe introuvable.", 404);

  const estGestionnaire = demandeur.role === "RESPONSABLE_QHSE" || demandeur.role === "ADMIN";
  const estAuteur = piece.ajouteParId === demandeur.userId;
  if (!estGestionnaire && !estAuteur) {
    throw new ErreurMetier("Vous ne pouvez supprimer que vos propres pièces jointes.", 403);
  }

  return await prisma.pieceJointe.delete({ where: { id } });
};

module.exports = { getPiecesByIncident, addPieceJointe, deletePieceJointe };
