const prisma = require("../config/prisma");

class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const INCLUDE_COMMENTAIRE = { auteur: { select: { id: true, nom: true, prenom: true } } };

// Vérifie l'appartenance de l'action à l'entreprise ET l'accès (QHSE/ADMIN ou
// le responsable assigné) — commenter/joindre est ouvert à tous ceux qui
// voient l'action, contrairement aux étapes qui restent gérées par le
// gestionnaire ou le responsable (verifierAcces d'etapeActionService).
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

const getCommentairesByAction = async (actionId, entrepriseId, demandeur) => {
  await verifierAcces(actionId, entrepriseId, demandeur);
  return await prisma.commentaireAction.findMany({
    where: { actionId },
    include: INCLUDE_COMMENTAIRE,
    orderBy: { createdAt: "asc" },
  });
};

const addCommentaire = async (actionId, data, auteurId, entrepriseId, demandeur) => {
  await verifierAcces(actionId, entrepriseId, demandeur);
  return await prisma.commentaireAction.create({
    data: { contenu: data.contenu.trim(), actionId, auteurId },
    include: INCLUDE_COMMENTAIRE,
  });
};

module.exports = { getCommentairesByAction, addCommentaire };
