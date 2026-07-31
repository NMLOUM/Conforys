const prisma = require("../config/prisma");
const { enregistrerAction } = require("./historiqueService");

class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Vérifie l'appartenance de l'action à l'entreprise ET que le demandeur peut
// la gérer (QHSE/ADMIN ou le responsable assigné) — même règle que la
// consultation du détail (getActionById), utilisée aussi pour l'écriture.
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

const getEtapesByAction = async (actionId, entrepriseId, demandeur) => {
  await verifierAcces(actionId, entrepriseId, demandeur);
  return await prisma.etapeAction.findMany({
    where: { actionId },
    orderBy: { ordre: "asc" },
  });
};

const ajouterEtape = async (actionId, libelle, entrepriseId, demandeur) => {
  await verifierAcces(actionId, entrepriseId, demandeur);
  const nombreEtapes = await prisma.etapeAction.count({ where: { actionId } });

  const etape = await prisma.etapeAction.create({
    data: { actionId, libelle: libelle.trim(), ordre: nombreEtapes },
  });
  await enregistrerAction(actionId, demandeur.userId, "Étape ajoutée", libelle.trim().slice(0, 120));
  return etape;
};

// Bascule ou modifie une étape (complete et/ou libellé)
const modifierEtape = async (actionId, etapeId, data, entrepriseId, demandeur) => {
  await verifierAcces(actionId, entrepriseId, demandeur);
  const etape = await prisma.etapeAction.findFirst({ where: { id: etapeId, actionId } });
  if (!etape) throw new ErreurMetier("Étape introuvable.", 404);

  const misAJour = await prisma.etapeAction.update({
    where: { id: etapeId },
    data: {
      ...(data.libelle  !== undefined && { libelle: data.libelle.trim() }),
      ...(data.complete !== undefined && { complete: data.complete }),
    },
  });

  if (data.complete !== undefined && data.complete !== etape.complete) {
    await enregistrerAction(
      actionId,
      demandeur.userId,
      data.complete ? "Étape complétée" : "Étape rouverte",
      etape.libelle.slice(0, 120)
    );
  }
  return misAJour;
};

const supprimerEtape = async (actionId, etapeId, entrepriseId, demandeur) => {
  await verifierAcces(actionId, entrepriseId, demandeur);
  const etape = await prisma.etapeAction.findFirst({ where: { id: etapeId, actionId } });
  if (!etape) throw new ErreurMetier("Étape introuvable.", 404);
  await prisma.etapeAction.delete({ where: { id: etapeId } });
};

module.exports = { getEtapesByAction, ajouterEtape, modifierEtape, supprimerEtape, verifierAcces };
