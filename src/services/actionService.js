const prisma = require("../config/prisma");
const { enregistrer, enregistrerAction, enregistrerAudit } = require("./historiqueService");
const { creer: creerNotification } = require("./notificationService");

// Erreur métier avec code HTTP (400/403/404) — évite de renvoyer 500 sur des cas attendus
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Poids de chaque niveau de criticité converti en priorité d'action corrective
const PRIORITE_PAR_CRITICITE = { CRITIQUE: "CRITIQUE", MAJEUR: "ELEVE", MINEUR: "MOYEN" };

// Gravités d'incident pour lesquelles l'analyse des causes racines est
// obligatoire avant toute action corrective — un incident faible ou moyen a
// généralement une cause évidente, l'analyse formelle n'est pas exigée.
const GRAVITES_ANALYSE_REQUISE = ["GRAVE", "CRITIQUE"];

// Include partagé : responsable + incident + audit + risque (une action n'a
// jamais plus d'une seule de ces trois relations à la fois)
const INCLUDE_ACTION = {
  responsable: { select: { id: true, nom: true, prenom: true, email: true } },
  incident:    { select: { id: true, numeroReference: true, site: { select: { id: true, nom: true } } } },
  audit:       { select: { id: true, reference: true, site: { select: { id: true, nom: true } } } },
  risque:      { select: { id: true, danger: true, site: { select: { id: true, nom: true } } } },
};

// Récupère toutes les actions d'un incident, triées du plus récent au plus ancien
const getActionsByIncident = async (incidentId, entrepriseId) => {
  return await prisma.actionCorrective.findMany({
    where: { incidentId, incident: { declarePar: { entrepriseId } } },
    include: INCLUDE_ACTION,
    orderBy: { createdAt: "desc" },
  });
};

// Vérifie que l'utilisateur assigné comme responsable appartient bien à
// l'entreprise du demandeur — empêche d'assigner (par erreur ou par un id
// deviné) une action à un utilisateur d'une autre entreprise.
const verifierResponsable = async (responsableId, entrepriseId) => {
  const utilisateur = await prisma.user.findFirst({ where: { id: responsableId, entrepriseId } });
  if (!utilisateur) throw new ErreurMetier("Responsable introuvable dans votre entreprise.", 404);
};

// Crée une nouvelle action corrective liée à un incident
const createAction = async (incidentId, data, auteurId, entrepriseId) => {
  const incident = await prisma.incident.findFirst({ where: { id: incidentId, declarePar: { entrepriseId } } });
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);

  // Incident grave/critique : la cause doit d'abord être investiguée. On
  // exige que l'analyse des causes ait au moins été initialisée (pas
  // nécessairement validée) — ce garde-fou ne s'applique pas aux incidents
  // faible/moyen, où la cause est en général évidente sans analyse formelle.
  if (GRAVITES_ANALYSE_REQUISE.includes(incident.gravite)) {
    const analyse = await prisma.analyseCauses.findUnique({ where: { incidentId } });
    if (!analyse) {
      throw new ErreurMetier(
        "Une analyse des causes est requise pour un incident grave ou critique avant de créer une action corrective."
      );
    }
  }

  await verifierResponsable(data.responsableId, entrepriseId);

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
  await enregistrerAction(action.id, auteurId, "Action créée");
  await creerNotification(
    action.responsableId, "ACTION_ASSIGNEE", "Action corrective assignée",
    action.description.slice(0, 120), `/actions/${action.id}`
  );
  return action;
};

// Récupère une action avec tout le détail nécessaire à la page CAPA (étapes,
// checklist, compteurs). Vérifie l'appartenance à l'entreprise ET l'accès :
// QHSE/ADMIN voient toute action de l'entreprise, un EMPLOYE ne voit que les
// actions dont il est le responsable assigné.
const getActionById = async (id, entrepriseId, demandeur) => {
  const action = await prisma.actionCorrective.findFirst({
    where: {
      id,
      OR: [
        { incident: { declarePar: { entrepriseId } } },
        { audit: { auditeur: { entrepriseId } } },
        { risque: { site: { entrepriseId } } },
      ],
    },
    include: {
      ...INCLUDE_ACTION,
      etapes: { orderBy: { ordre: "asc" } },
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

// Vérifie qu'une action appartient à l'entreprise du demandeur, via celle de
// ses trois relations parentes (incident/audit/risque, mutuellement
// exclusives) — empêche de modifier/clôturer/supprimer une action d'une
// autre entreprise en connaissant/devinant son id.
const verifierAppartenance = async (id, entrepriseId) => {
  const action = await prisma.actionCorrective.findFirst({
    where: {
      id,
      OR: [
        { incident: { declarePar: { entrepriseId } } },
        { audit: { auditeur: { entrepriseId } } },
        { risque: { site: { entrepriseId } } },
      ],
    },
  });
  if (!action) throw new ErreurMetier("Action introuvable.", 404);
  return action;
};

// Met à jour une action (description, priorité, statut, date limite, responsable)
const updateAction = async (id, data, entrepriseId, auteurId) => {
  const action = await verifierAppartenance(id, entrepriseId);

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

  if (data.responsableId !== undefined) {
    await verifierResponsable(data.responsableId, entrepriseId);
  }

  const misAJour = await prisma.actionCorrective.update({
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

  if (data.statut !== undefined && data.statut !== action.statut) {
    await enregistrerAction(id, auteurId, `Statut changé : ${action.statut} → ${data.statut}`);
  } else {
    await enregistrerAction(id, auteurId, "Action modifiée");
  }

  if (data.responsableId !== undefined && data.responsableId !== action.responsableId) {
    await creerNotification(
      data.responsableId, "ACTION_ASSIGNEE", "Action corrective assignée",
      misAJour.description.slice(0, 120), `/actions/${id}`
    );
  }

  return misAJour;
};

// Clôture une action : passe au statut TERMINE, remplit dateCloture et commentaire
const cloturerAction = async (id, commentaireCloture, entrepriseId, auteurId) => {
  const action = await verifierAppartenance(id, entrepriseId);

  if (action.statut === "TERMINE") throw new ErreurMetier("Cette action est déjà clôturée.");
  if (action.statut === "ANNULE")  throw new ErreurMetier("Impossible de clôturer une action annulée.");

  const cloturee = await prisma.actionCorrective.update({
    where: { id },
    data: {
      statut:             "TERMINE",
      dateCloture:        new Date(),
      commentaireCloture: commentaireCloture.trim(),
    },
    include: INCLUDE_ACTION,
  });
  await enregistrerAction(id, auteurId, "Action clôturée", commentaireCloture.trim().slice(0, 120));
  return cloturee;
};

// Permet au responsable assigné de démarrer son action (A_FAIRE → EN_COURS)
const progresserAction = async (id, userId, entrepriseId) => {
  const action = await verifierAppartenance(id, entrepriseId);
  if (action.responsableId !== userId)
    throw new ErreurMetier("Vous n'êtes pas responsable de cette action.", 403);
  if (action.statut !== "A_FAIRE")
    throw new ErreurMetier("Seules les actions « À faire » peuvent être démarrées.");

  const progressee = await prisma.actionCorrective.update({
    where: { id },
    data:  { statut: "EN_COURS" },
    include: INCLUDE_ACTION,
  });
  await enregistrerAction(id, userId, "Statut changé : A_FAIRE → EN_COURS");
  return progressee;
};

// Supprime définitivement une action (ADMIN uniquement)
const deleteAction = async (id, entrepriseId) => {
  await verifierAppartenance(id, entrepriseId);
  return await prisma.actionCorrective.delete({ where: { id } });
};

// Vue globale de toutes les actions d'une entreprise (QHSE/ADMIN)
// Scopée par entreprise via l'incident déclaré OU l'auditeur de l'audit
// (une action n'a jamais les deux relations à la fois).
const getAllActions = async (entrepriseId, { statut, priorite, responsableId } = {}) => {
  const where = {
    OR: [
      { incident: { declarePar: { entrepriseId } } },
      { audit: { auditeur: { entrepriseId } } },
      { risque: { site: { entrepriseId } } },
    ],
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

// Récupère toutes les actions correctives d'un audit, triées du plus récent au plus ancien
const getActionsByAudit = async (auditId, entrepriseId) => {
  return await prisma.actionCorrective.findMany({
    where: { auditId, audit: { auditeur: { entrepriseId } } },
    include: INCLUDE_ACTION,
    orderBy: { createdAt: "desc" },
  });
};

// Génère automatiquement une action corrective pour chaque question NON_CONFORME
// de l'audit. Idempotent : si on régénère, les questions déjà couvertes par une
// action existante (même description, donc même libellé) ne sont pas dupliquées.
// Le responsable et l'échéance sont saisis par le QHSE avant la génération
// (formulaire côté frontend) — appliqués à toutes les actions de ce lot.
const genererActionsDepuisAudit = async (auditId, entrepriseId, { responsableId, dateLimite } = {}) => {
  const audit = await prisma.audit.findFirst({
    where: { id: auditId, auditeur: { entrepriseId } },
    include: { questions: true },
  });
  if (!audit) throw new ErreurMetier("Audit introuvable.", 404);

  const nonConformes = audit.questions.filter((q) => q.reponse === "NON_CONFORME");

  if (nonConformes.length > 0) {
    await verifierResponsable(responsableId, entrepriseId);

    const existantes = await prisma.actionCorrective.findMany({
      where: { auditId },
      select: { description: true },
    });
    const descriptionsExistantes = new Set(existantes.map((a) => a.description));

    const aCreer = nonConformes
      .map((q) => ({
        description:   `Corriger la non-conformité : ${q.libelle}`,
        priorite:      PRIORITE_PAR_CRITICITE[q.criticite],
        statut:        "A_FAIRE",
        auditId,
        responsableId,
        dateLimite: dateLimite ? new Date(dateLimite) : null,
      }))
      .filter((a) => !descriptionsExistantes.has(a.description));

    if (aCreer.length > 0) {
      await prisma.actionCorrective.createMany({ data: aCreer });
      // createMany ne renvoie pas les lignes créées — on les relit pour
      // journaliser chacune individuellement dans son propre historique.
      const creees = await prisma.actionCorrective.findMany({
        where: { auditId, description: { in: aCreer.map((a) => a.description) } },
        select: { id: true, description: true },
      });
      for (const a of creees) {
        await enregistrerAction(a.id, audit.auditeurId, "Action créée", `Générée depuis l'audit : ${audit.reference}`);
        await creerNotification(
          responsableId, "ACTION_ASSIGNEE", "Action corrective assignée",
          a.description.slice(0, 120), `/actions/${a.id}`
        );
      }
      await enregistrerAudit(auditId, audit.auditeurId, "Plan d'actions correctives généré", `${creees.length} action(s) créée(s)`);
    }
  }

  return await getActionsByAudit(auditId, entrepriseId);
};

// Actions assignées à l'utilisateur connecté — tous rôles (vue "Mes actions").
// Scope entreprise ajouté en défense en profondeur (le responsable ne devrait
// jamais être hors entreprise grâce à verifierResponsable, mais on ne prend pas
// le risque d'exposer une action mal assignée par un autre chemin).
const getMesActions = async (userId, entrepriseId) => {
  return await prisma.actionCorrective.findMany({
    where: {
      responsableId: userId,
      OR: [
        { incident: { declarePar: { entrepriseId } } },
        { audit: { auditeur: { entrepriseId } } },
        { risque: { site: { entrepriseId } } },
      ],
    },
    include: INCLUDE_ACTION,
    orderBy: [{ dateLimite: "asc" }, { createdAt: "desc" }],
  });
};

module.exports = {
  getActionsByIncident,
  createAction,
  getActionById,
  updateAction,
  cloturerAction,
  progresserAction,
  deleteAction,
  getAllActions,
  getMesActions,
  getActionsByAudit,
  genererActionsDepuisAudit,
  verifierResponsable,
};
