// DUERP (Document Unique d'Évaluation des Risques Professionnels) : recense
// les risques professionnels, les cote par probabilité × gravité, et permet
// de générer une action de prévention (réutilise ActionCorrective) pour les
// risques élevés ou critiques.
const prisma = require("../config/prisma");
const { enregistrerRisque, enregistrerAction, getHistoriqueByRisque: getHistorique } = require("./historiqueService");
const { creer: creerNotification } = require("./notificationService");
const { verifierResponsable } = require("./actionService");

// Erreur métier avec code HTTP — cohérent avec les autres services
class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ── Cotation ──────────────────────────────────────────────────────────────
//
// niveauRisque (1 à 16) = probabilite × gravite. Le niveau qualitatif n'est
// jamais stocké : il est dérivé du niveau numérique à la lecture, par plage.
const PLAGES_NIVEAU = {
  FAIBLE:   { min: 1,  max: 3 },
  MODERE:   { min: 4,  max: 7 },
  ELEVE:    { min: 8,  max: 11 },
  CRITIQUE: { min: 12, max: 16 },
};

const calculerNiveauQualitatif = (niveau) => {
  if (niveau == null) return null;
  if (niveau <= 3)  return "FAIBLE";
  if (niveau <= 7)  return "MODERE";
  if (niveau <= 11) return "ELEVE";
  return "CRITIQUE";
};

const getRisqueScope = (entrepriseId, { role, siteId } = {}) => ({
  site: { entrepriseId },
  ...(role === "EMPLOYE" && { siteId: siteId || "__AUCUN_SITE__" }),
});

// Annote un risque (objet Prisma) avec ses niveaux qualitatifs calculés et le
// nombre d'actions de prévention déjà générées (évite de re-proposer le
// bouton "Générer une action" une fois que c'est déjà fait)
const avecNiveaux = (risque) => {
  const { _count, ...reste } = risque;
  return {
    ...reste,
    niveauQualitatif: calculerNiveauQualitatif(risque.niveauRisque),
    niveauQualitatifResiduel: calculerNiveauQualitatif(risque.niveauResiduel),
    nombreActions: _count?.actions ?? 0,
  };
};

// Include partagé : site + auteur + actions de prévention générées (au plus
// une en pratique, la génération étant idempotente) + leur nombre
const INCLUDE_RISQUE = {
  site:   { select: { id: true, nom: true } },
  auteur: { select: { id: true, nom: true, prenom: true } },
  actions: {
    select: {
      id: true, description: true, statut: true, priorite: true, dateLimite: true,
      responsable: { select: { id: true, nom: true, prenom: true } },
    },
  },
  _count: { select: { actions: true } },
};

// Liste les risques de l'entreprise, avec filtres optionnels
const getAllRisques = async (entrepriseId, { siteId, categorie, niveau } = {}, userScope = {}) => {
  const where = {
    ...getRisqueScope(entrepriseId, userScope),
    ...(userScope.role !== "EMPLOYE" && siteId && { siteId }),
    ...(categorie && { categorie }),
  };
  if (niveau && PLAGES_NIVEAU[niveau]) {
    where.niveauRisque = { gte: PLAGES_NIVEAU[niveau].min, lte: PLAGES_NIVEAU[niveau].max };
  }

  const risques = await prisma.risque.findMany({
    where,
    include: INCLUDE_RISQUE,
    orderBy: { niveauRisque: "desc" },
  });
  return risques.map(avecNiveaux);
};

// Récupère un risque par son id — scopé à l'entreprise du demandeur (renvoie
// null si le risque n'existe pas ou appartient à une autre entreprise).
const getRisqueById = async (id, entrepriseId, userScope = {}) => {
  const risque = await prisma.risque.findFirst({ where: { id, ...getRisqueScope(entrepriseId, userScope) }, include: INCLUDE_RISQUE });
  return risque ? avecNiveaux(risque) : null;
};

// Vérifie que le site visé appartient bien à l'entreprise du demandeur —
// empêche de rattacher un risque au site d'une autre entreprise en
// connaissant/devinant son id.
const verifierSite = async (siteId, entrepriseId) => {
  const site = await prisma.site.findFirst({ where: { id: siteId, entrepriseId } });
  if (!site) throw new ErreurMetier("Site introuvable.", 404);
};

// Crée un nouveau risque — calcule le niveau (et le niveau résiduel si la
// cotation après mesures est renseignée)
const createRisque = async (data, auteurId, entrepriseId) => {
  await verifierSite(data.siteId, entrepriseId);

  const niveauRisque = data.probabilite * data.gravite;
  const niveauResiduel = (data.probabiliteResiduelle && data.graviteResiduelle)
    ? data.probabiliteResiduelle * data.graviteResiduelle
    : null;

  const risque = await prisma.risque.create({
    data: {
      danger:            data.danger,
      description:       data.description || null,
      categorie:         data.categorie || "AUTRE",
      zone:              data.zone || null,
      probabilite:       data.probabilite,
      gravite:           data.gravite,
      niveauRisque,
      mesuresPrevention: data.mesuresPrevention || null,
      probabiliteResiduelle: data.probabiliteResiduelle ?? null,
      graviteResiduelle:     data.graviteResiduelle ?? null,
      niveauResiduel,
      siteId:   data.siteId,
      auteurId,
    },
    include: INCLUDE_RISQUE,
  });
  await enregistrerRisque(risque.id, auteurId, "Risque identifié", `Cotation initiale : ${niveauRisque} (${calculerNiveauQualitatif(niveauRisque)})`);
  return avecNiveaux(risque);
};

// Met à jour un risque existant — recalcule le(s) niveau(x) à partir des
// valeurs déjà en base pour les champs non fournis (mise à jour partielle).
const updateRisque = async (id, data, auteurId, entrepriseId) => {
  const existant = await prisma.risque.findFirst({ where: { id, site: { entrepriseId } } });
  if (!existant) throw new ErreurMetier("Risque introuvable.", 404);
  if (data.siteId && data.siteId !== existant.siteId) await verifierSite(data.siteId, entrepriseId);

  const probabilite = data.probabilite ?? existant.probabilite;
  const gravite      = data.gravite    ?? existant.gravite;
  const niveauRisque = probabilite * gravite;

  const probabiliteResiduelle = data.probabiliteResiduelle !== undefined
    ? data.probabiliteResiduelle : existant.probabiliteResiduelle;
  const graviteResiduelle = data.graviteResiduelle !== undefined
    ? data.graviteResiduelle : existant.graviteResiduelle;
  const niveauResiduel = (probabiliteResiduelle && graviteResiduelle)
    ? probabiliteResiduelle * graviteResiduelle
    : null;

  const risque = await prisma.risque.update({
    where: { id },
    data: {
      ...(data.danger      !== undefined && { danger: data.danger }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.categorie   !== undefined && { categorie: data.categorie }),
      ...(data.zone        !== undefined && { zone: data.zone || null }),
      ...(data.siteId      !== undefined && { siteId: data.siteId }),
      probabilite, gravite, niveauRisque,
      ...(data.mesuresPrevention !== undefined && { mesuresPrevention: data.mesuresPrevention || null }),
      probabiliteResiduelle: probabiliteResiduelle ?? null,
      graviteResiduelle:     graviteResiduelle ?? null,
      niveauResiduel,
    },
    include: INCLUDE_RISQUE,
  });

  if (niveauRisque !== existant.niveauRisque) {
    await enregistrerRisque(id, auteurId, `Cotation modifiée : ${existant.niveauRisque} → ${niveauRisque}`, `${calculerNiveauQualitatif(existant.niveauRisque)} → ${calculerNiveauQualitatif(niveauRisque)}`);
  }
  if (data.mesuresPrevention !== undefined && data.mesuresPrevention !== existant.mesuresPrevention) {
    await enregistrerRisque(id, auteurId, "Mesures de prévention mises à jour");
  }

  return avecNiveaux(risque);
};

// Supprime un risque — vérifie d'abord qu'il appartient à l'entreprise du demandeur
const deleteRisque = async (id, entrepriseId) => {
  const existant = await prisma.risque.findFirst({ where: { id, site: { entrepriseId } } });
  if (!existant) throw new ErreurMetier("Risque introuvable.", 404);
  return await prisma.risque.delete({ where: { id } });
};

// Données de la matrice 4×4 : une cellule par couple (probabilité, gravité),
// avec le nombre de risques qui s'y trouvent — sert à la fois à l'affichage
// et au comptage, sans recalcul côté frontend.
const getMatrice = async (entrepriseId, siteId, userScope = {}) => {
  const siteFiltre = userScope.role === "EMPLOYE" ? (userScope.siteId || "__AUCUN_SITE__") : siteId;
  const risques = await prisma.risque.findMany({
    where: { ...getRisqueScope(entrepriseId, userScope), ...(siteFiltre && { siteId: siteFiltre }) },
    select: { probabilite: true, gravite: true },
  });

  const cellules = [];
  for (let probabilite = 4; probabilite >= 1; probabilite--) {
    for (let gravite = 1; gravite <= 4; gravite++) {
      const nombre = risques.filter((r) => r.probabilite === probabilite && r.gravite === gravite).length;
      const niveauRisque = probabilite * gravite;
      cellules.push({
        probabilite, gravite, niveauRisque,
        niveauQualitatif: calculerNiveauQualitatif(niveauRisque),
        nombre,
      });
    }
  }
  return cellules;
};

// Génère une action de prévention (ActionCorrective) pour un risque élevé ou
// critique. Idempotent : si une action existe déjà pour ce risque, elle est
// simplement retournée (pas de doublon).
const genererActionDepuisRisque = async (risqueId, auteurId, entrepriseId, { description, responsableId, priorite, dateLimite } = {}) => {
  const risque = await prisma.risque.findFirst({ where: { id: risqueId, site: { entrepriseId } } });
  if (!risque) throw new ErreurMetier("Risque introuvable.", 404);

  const niveauQualitatif = calculerNiveauQualitatif(risque.niveauRisque);
  if (niveauQualitatif !== "ELEVE" && niveauQualitatif !== "CRITIQUE") {
    throw new ErreurMetier("Seuls les risques élevés ou critiques nécessitent une action de prévention.");
  }

  const existante = await prisma.actionCorrective.findFirst({ where: { risqueId } });
  if (existante) return existante;

  await verifierResponsable(responsableId, entrepriseId);

  const action = await prisma.actionCorrective.create({
    data: {
      description:   description?.trim() || `Mesure de prévention pour le risque : ${risque.danger}${risque.zone ? ` (${risque.zone})` : ""}`,
      priorite:      priorite || niveauQualitatif, // "ELEVE" ou "CRITIQUE" par défaut — mêmes libellés que PrioriteAction
      statut:        "A_FAIRE",
      risqueId,
      responsableId,
      dateLimite: dateLimite ? new Date(dateLimite) : null,
    },
    include: { responsable: { select: { id: true, nom: true, prenom: true } } },
  });
  await enregistrerRisque(risqueId, auteurId, "Action de prévention générée");
  await enregistrerAction(action.id, auteurId, "Action créée", `Générée depuis le risque : ${risque.danger}`);
  await creerNotification(
    action.responsableId, "ACTION_ASSIGNEE", "Action corrective assignée",
    action.description.slice(0, 120), `/actions/${action.id}`
  );
  return action;
};

// Historique d'un risque — vérifie d'abord qu'il appartient à l'entreprise du
// demandeur (sans quoi l'id d'un risque d'une autre entreprise suffirait à en
// lire tout l'historique de cotation).
const getHistoriqueByRisque = async (risqueId, entrepriseId, userScope = {}) => {
  const risque = await prisma.risque.findFirst({ where: { id: risqueId, ...getRisqueScope(entrepriseId, userScope) } });
  if (!risque) throw new ErreurMetier("Risque introuvable.", 404);
  return getHistorique(risqueId);
};

// ── Révision annuelle du DUERP ───────────────────────────────────────────────
//
// Obligation légale : le DUERP doit être révisé au moins une fois par an (ou à
// chaque changement significatif). On ne stocke qu'une seule date par
// entreprise (dernière révision formelle) ; l'échéance est dérivée à la
// lecture (+ 1 an), jamais recalculée/stockée pour rester toujours exacte.
const UN_AN_MS = 365 * 24 * 60 * 60 * 1000;

const getStatutRevision = async (entrepriseId) => {
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: entrepriseId },
    select: { dateDerniereRevisionDuerp: true },
  });

  const dateDerniereRevision = entreprise?.dateDerniereRevisionDuerp ?? null;
  const dateProchaineRevision = dateDerniereRevision
    ? new Date(dateDerniereRevision.getTime() + UN_AN_MS)
    : null;
  const enRetard = !dateProchaineRevision || dateProchaineRevision.getTime() < Date.now();

  return { dateDerniereRevision, dateProchaineRevision, enRetard };
};

// Marque le DUERP comme révisé aujourd'hui — repousse l'échéance d'un an.
const marquerRevise = async (entrepriseId) => {
  await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { dateDerniereRevisionDuerp: new Date() },
  });
  return getStatutRevision(entrepriseId);
};

module.exports = {
  calculerNiveauQualitatif,
  getAllRisques,
  getRisqueById,
  createRisque,
  updateRisque,
  deleteRisque,
  getMatrice,
  genererActionDepuisRisque,
  getHistoriqueByRisque,
  getStatutRevision,
  marquerRevise,
};
