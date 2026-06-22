const prisma = require("../config/prisma");
const { enregistrer } = require("./historiqueService");

// Erreur métier avec code HTTP (400/403/404) — évite de renvoyer 500 sur des cas attendus
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Include partagé : responsable + incident (pour toutes les réponses)
const INCLUDE_ACTION = {
  responsable: { select: { id: true, nom: true, prenom: true, email: true } },
  incident:    { select: { id: true, numeroReference: true } },
};

// Récupère toutes les actions d'un incident, triées du plus récent au plus ancien
const getActionsByIncident = async (incidentId) => {
  return await prisma.actionCorrective.findMany({
    where: { incidentId },
    include: INCLUDE_ACTION,
    orderBy: { createdAt: "desc" },
  });
};

// Crée une nouvelle action corrective liée à un incident
const createAction = async (incidentId, data, auteurId) => {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);

  const action = await prisma.actionCorrective.create({
    data: {
      description:  data.description,
      priorite:     data.priorite  ?? "MOYEN",
      dateLimite:   data.dateLimite ? new Date(data.dateLimite) : null,
      incidentId,
      responsableId: data.responsableId,
    },
    include: INCLUDE_ACTION,
  });
  await enregistrer(incidentId, auteurId, "Action corrective ajoutée", action.description.slice(0, 120));
  return action;
};

// Met à jour une action (description, priorité, statut, date limite, responsable)
const updateAction = async (id, data) => {
  const action = await prisma.actionCorrective.findUnique({ where: { id } });
  if (!action) throw new ErreurMetier("Action introuvable.", 404);

  // Bloquer la modification d'une action déjà clôturée ou annulée
  if (action.statut === "TERMINE" || action.statut === "ANNULE") {
    throw new ErreurMetier("Impossible de modifier une action clôturée ou annulée.");
  }

  // Garde supplémentaire : TERMINE ne peut être atteint que via /cloturer (commentaire obligatoire)
  if (data.statut === "TERMINE") {
    throw new ErreurMetier(
      "Pour clôturer une action, utilisez la route /cloturer (commentaire obligatoire)."
    );
  }

  return await prisma.actionCorrective.update({
    where: { id },
    data: {
      ...(data.description  !== undefined && { description:  data.description }),
      ...(data.priorite     !== undefined && { priorite:     data.priorite }),
      ...(data.statut       !== undefined && { statut:       data.statut }),
      ...(data.dateLimite   !== undefined && {
        dateLimite: data.dateLimite ? new Date(data.dateLimite) : null,
      }),
      ...(data.responsableId !== undefined && { responsableId: data.responsableId }),
    },
    include: INCLUDE_ACTION,
  });
};

// Clôture une action : passe au statut TERMINE, remplit dateCloture et commentaire
const cloturerAction = async (id, commentaireCloture) => {
  const action = await prisma.actionCorrective.findUnique({ where: { id } });
  if (!action) throw new ErreurMetier("Action introuvable.", 404);

  if (action.statut === "TERMINE") throw new ErreurMetier("Cette action est déjà clôturée.");
  if (action.statut === "ANNULE")  throw new ErreurMetier("Impossible de clôturer une action annulée.");

  return await prisma.actionCorrective.update({
    where: { id },
    data: {
      statut:             "TERMINE",
      dateCloture:        new Date(),
      commentaireCloture: commentaireCloture.trim(),
    },
    include: INCLUDE_ACTION,
  });
};

// Permet au responsable assigné de démarrer son action (A_FAIRE → EN_COURS)
const progresserAction = async (id, userId) => {
  const action = await prisma.actionCorrective.findUnique({ where: { id } });
  if (!action) throw new ErreurMetier("Action introuvable.", 404);
  if (action.responsableId !== userId)
    throw new ErreurMetier("Vous n'êtes pas responsable de cette action.", 403);
  if (action.statut !== "A_FAIRE")
    throw new ErreurMetier("Seules les actions « À faire » peuvent être démarrées.");

  return await prisma.actionCorrective.update({
    where: { id },
    data:  { statut: "EN_COURS" },
    include: INCLUDE_ACTION,
  });
};

// Supprime définitivement une action (ADMIN uniquement)
const deleteAction = async (id) => {
  const action = await prisma.actionCorrective.findUnique({ where: { id } });
  if (!action) throw new ErreurMetier("Action introuvable.", 404);
  return await prisma.actionCorrective.delete({ where: { id } });
};

// Vue globale de toutes les actions d'une entreprise (QHSE/ADMIN)
// Scopée par entreprise via l'incident déclaré : on ne voit que les actions
// liées aux incidents de l'entreprise du connecté.
const getAllActions = async (entrepriseId, { statut, priorite, responsableId } = {}) => {
  const where = {
    incident: { declarePar: { entrepriseId } },
    ...(statut        && { statut }),
    ...(priorite      && { priorite }),
    ...(responsableId && { responsableId }),
  };
  return await prisma.actionCorrective.findMany({
    where,
    include: INCLUDE_ACTION,
    orderBy: [{ dateLimite: "asc" }, { createdAt: "desc" }],
  });
};

// Actions assignées à l'utilisateur connecté — tous rôles (vue "Mes actions")
const getMesActions = async (userId) => {
  return await prisma.actionCorrective.findMany({
    where: { responsableId: userId },
    include: INCLUDE_ACTION,
    orderBy: [{ dateLimite: "asc" }, { createdAt: "desc" }],
  });
};

module.exports = {
  getActionsByIncident,
  createAction,
  updateAction,
  cloturerAction,
  progresserAction,
  deleteAction,
  getAllActions,
  getMesActions,
};
