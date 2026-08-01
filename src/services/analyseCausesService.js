// Analyse des causes racines d'un incident : diagramme d'Ishikawa (5M) pour
// recenser les causes potentielles par catégorie, et méthode des 5 Pourquoi
// pour remonter jusqu'à la cause profonde. Une seule analyse par incident.
const prisma = require("../config/prisma");
const { enregistrer, enregistrerAction } = require("./historiqueService");
const { creer: creerNotification } = require("./notificationService");

class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Mêmes seuils que les autres modules : la priorité de l'action générée est
// dérivée de la gravité de l'incident, jamais ressaisie manuellement.
const PRIORITE_PAR_GRAVITE = { FAIBLE: "FAIBLE", MOYEN: "MOYEN", GRAVE: "ELEVE", CRITIQUE: "CRITIQUE" };

const INCLUDE_ANALYSE = {
  auteur: { select: { id: true, nom: true, prenom: true } },
  causesIshikawa: { orderBy: { createdAt: "asc" } },
  etapesPourquoi: { orderBy: { ordre: "asc" } },
};

// Vérifie que l'incident visé appartient bien à l'entreprise du demandeur —
// même garde-fou que le reste du module Incidents.
const verifierIncident = async (incidentId, entrepriseId) => {
  const incident = await prisma.incident.findFirst({ where: { id: incidentId, declarePar: { entrepriseId } } });
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);
  return incident;
};

// Récupère l'analyse d'un incident (ou null si elle n'a pas encore été initialisée)
const getAnalyse = async (incidentId, entrepriseId) => {
  await verifierIncident(incidentId, entrepriseId);
  return await prisma.analyseCauses.findUnique({
    where: { incidentId },
    include: INCLUDE_ANALYSE,
  });
};

// Initialise l'analyse d'un incident — pré-remplit le problème avec la
// description de l'incident. Idempotent : si une analyse existe déjà, elle
// est simplement retournée (pas de doublon, la contrainte unique incidentId
// l'empêcherait de toute façon).
const initialiserAnalyse = async (incidentId, auteurId, entrepriseId) => {
  const incident = await verifierIncident(incidentId, entrepriseId);

  const existante = await prisma.analyseCauses.findUnique({ where: { incidentId }, include: INCLUDE_ANALYSE });
  if (existante) return existante;

  return await prisma.analyseCauses.create({
    data: { incidentId, probleme: incident.description, auteurId },
    include: INCLUDE_ANALYSE,
  });
};

// Met à jour l'analyse : cause racine, remplacement complet des causes
// Ishikawa et/ou des étapes des 5 Pourquoi (le frontend renvoie l'état
// complet de chaque section à chaque sauvegarde), et validation ponctuelle.
const updateAnalyse = async (incidentId, data, entrepriseId) => {
  await verifierIncident(incidentId, entrepriseId);

  const analyse = await prisma.analyseCauses.findUnique({ where: { incidentId } });
  if (!analyse) throw new ErreurMetier("Analyse introuvable — initialisez-la d'abord.", 404);

  await prisma.$transaction(async (tx) => {
    const dataToUpdate = {};
    if (data.causeRacine !== undefined) dataToUpdate.causeRacine = data.causeRacine || null;
    if (data.valider) dataToUpdate.valideLe = new Date();

    if (Object.keys(dataToUpdate).length > 0) {
      await tx.analyseCauses.update({ where: { id: analyse.id }, data: dataToUpdate });
    }

    // Remplacement complet des causes Ishikawa (simple et prévisible : le
    // frontend gère l'état local de chaque branche et sauvegarde l'ensemble)
    if (data.causesIshikawa !== undefined) {
      await tx.causeIshikawa.deleteMany({ where: { analyseId: analyse.id } });
      if (data.causesIshikawa.length > 0) {
        await tx.causeIshikawa.createMany({
          data: data.causesIshikawa.map((c) => ({
            analyseId: analyse.id,
            categorie: c.categorie,
            libelle: c.libelle,
            retenue: Boolean(c.retenue),
          })),
        });
      }
    }

    // Remplacement complet des étapes des 5 Pourquoi (même logique)
    if (data.etapesPourquoi !== undefined) {
      await tx.etapePourquoi.deleteMany({ where: { analyseId: analyse.id } });
      if (data.etapesPourquoi.length > 0) {
        await tx.etapePourquoi.createMany({
          data: data.etapesPourquoi.map((e) => ({
            analyseId: analyse.id,
            ordre: e.ordre,
            question: e.question,
            reponse: e.reponse,
          })),
        });
      }
    }
  });

  return await prisma.analyseCauses.findUnique({ where: { incidentId }, include: INCLUDE_ANALYSE });
};

// Génère une action corrective à partir de la cause racine retenue —
// réutilise le système d'actions correctives existant (ActionCorrective liée
// à l'incident). Le responsable par défaut est l'auteur de l'analyse (le
// QHSE qui l'a menée) et la priorité est dérivée de la gravité de l'incident,
// même principe que risqueService.genererActionDepuisRisque.
const genererActionDepuisAnalyse = async (incidentId, entrepriseId) => {
  const incident = await verifierIncident(incidentId, entrepriseId);

  const analyse = await prisma.analyseCauses.findUnique({ where: { incidentId } });
  if (!analyse) throw new ErreurMetier("Analyse introuvable — initialisez-la d'abord.", 404);
  if (!analyse.causeRacine || !analyse.causeRacine.trim()) {
    throw new ErreurMetier("Renseignez la cause racine avant de générer une action corrective.");
  }
  if (analyse.actionGenereeLe) {
    throw new ErreurMetier("Une action corrective a déjà été générée pour cette analyse.");
  }

  const action = await prisma.actionCorrective.create({
    data: {
      description:   `Action corrective — cause racine : ${analyse.causeRacine}`,
      priorite:      PRIORITE_PAR_GRAVITE[incident.gravite] ?? "MOYEN",
      statut:        "A_FAIRE",
      incidentId,
      responsableId: analyse.auteurId,
    },
    include: { responsable: { select: { id: true, nom: true, prenom: true } } },
  });
  await prisma.analyseCauses.update({ where: { id: analyse.id }, data: { actionGenereeLe: new Date() } });
  await enregistrer(incidentId, analyse.auteurId, "Action corrective ajoutée", action.description.slice(0, 120));
  await enregistrerAction(action.id, analyse.auteurId, "Action créée", "Générée depuis l'analyse des causes");
  await creerNotification(
    action.responsableId, "ACTION_ASSIGNEE", "Action corrective assignée",
    action.description.slice(0, 120), `/actions/${action.id}`
  );
  return action;
};

module.exports = {
  getAnalyse,
  initialiserAnalyse,
  updateAnalyse,
  genererActionDepuisAnalyse,
};
