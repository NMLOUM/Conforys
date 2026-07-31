const prisma = require("../config/prisma");
const { enregistrerAction } = require("./historiqueService");

class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const INCLUDE_PIECE = {
  ajoutePar: { select: { id: true, nom: true, prenom: true } },
};

// Même règle d'accès que les commentaires : QHSE/ADMIN ou le responsable assigné
const verifierAcces = async (actionId, entrepriseId, demandeur) => {
  const action = await prisma.actionCorrective.findFirst({
    where: {
      id: actionId,
      OR: [
        { incident: { declarePar: { entrepriseId } } },
        { audit: { auditeur: { entrepriseId } } },
        { risque: { site: { entrepriseId } } },
      ],
    },
  });
  if (!action) throw new ErreurMetier("Action introuvable.", 404);

  const estGestionnaire = demandeur.role === "RESPONSABLE_QHSE" || demandeur.role === "ADMIN";
  const estResponsable  = action.responsableId === demandeur.userId;
  if (!estGestionnaire && !estResponsable) {
    throw new ErreurMetier("Vous n'avez pas accès à cette action.", 403);
  }
  return action;
};

const getPiecesByAction = async (actionId, entrepriseId, demandeur) => {
  await verifierAcces(actionId, entrepriseId, demandeur);
  return await prisma.pieceJointeAction.findMany({
    where: { actionId },
    include: INCLUDE_PIECE,
    orderBy: { dateAjout: "desc" },
  });
};

const addPieceJointe = async (actionId, data, auteurId, entrepriseId, demandeur) => {
  await verifierAcces(actionId, entrepriseId, demandeur);

  const piece = await prisma.pieceJointeAction.create({
    data: {
      url:         data.url,
      nom:         data.nom  || null,
      type:        data.type || "IMAGE",
      taille:      data.taille ?? null,
      actionId,
      ajouteParId: auteurId,
    },
    include: INCLUDE_PIECE,
  });
  await enregistrerAction(actionId, auteurId, "Pièce jointe ajoutée", data.nom || "sans nom");
  return piece;
};

// Suppression : QHSE/ADMIN ou l'auteur de l'ajout (même règle que les pièces
// jointes d'incident) — vérifiée directement ici, pas via verifierAcces qui
// autorise aussi le responsable assigné (plus large que "l'auteur").
const deletePieceJointe = async (id, entrepriseId, demandeur) => {
  const piece = await prisma.pieceJointeAction.findFirst({
    where: {
      id,
      action: {
        OR: [
          { incident: { declarePar: { entrepriseId } } },
          { audit: { auditeur: { entrepriseId } } },
          { risque: { site: { entrepriseId } } },
        ],
      },
    },
  });
  if (!piece) throw new ErreurMetier("Pièce jointe introuvable.", 404);

  const estGestionnaire = demandeur.role === "RESPONSABLE_QHSE" || demandeur.role === "ADMIN";
  const estAuteur = piece.ajouteParId === demandeur.userId;
  if (!estGestionnaire && !estAuteur) {
    throw new ErreurMetier("Vous ne pouvez supprimer que vos propres pièces jointes.", 403);
  }

  return await prisma.pieceJointeAction.delete({ where: { id } });
};

module.exports = { getPiecesByAction, addPieceJointe, deletePieceJointe };
