// DUERP (Document Unique d'Évaluation des Risques Professionnels) : recense
// les risques professionnels, les cote par probabilité × gravité, et permet
// de générer une action de prévention (réutilise ActionCorrective) pour les
// risques élevés ou critiques.
const prisma = require("../config/prisma");

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

// Include partagé : site + auteur + nombre d'actions déjà générées
const INCLUDE_RISQUE = {
  site:   { select: { id: true, nom: true } },
  auteur: { select: { id: true, nom: true, prenom: true } },
  _count: { select: { actions: true } },
};

// Liste les risques de l'entreprise, avec filtres optionnels
const getAllRisques = async (entrepriseId, { siteId, categorie, niveau } = {}) => {
  const where = {
    site: { entrepriseId },
    ...(siteId    && { siteId }),
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

// Récupère un risque par son id
const getRisqueById = async (id) => {
  const risque = await prisma.risque.findUnique({ where: { id }, include: INCLUDE_RISQUE });
  return risque ? avecNiveaux(risque) : null;
};

// Crée un nouveau risque — calcule le niveau (et le niveau résiduel si la
// cotation après mesures est renseignée)
const createRisque = async (data, auteurId) => {
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
  return avecNiveaux(risque);
};

// Met à jour un risque existant — recalcule le(s) niveau(x) à partir des
// valeurs déjà en base pour les champs non fournis (mise à jour partielle).
const updateRisque = async (id, data) => {
  const existant = await prisma.risque.findUnique({ where: { id } });
  if (!existant) throw new ErreurMetier("Risque introuvable.", 404);

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
  return avecNiveaux(risque);
};

// Supprime un risque
const deleteRisque = async (id) => {
  return await prisma.risque.delete({ where: { id } });
};

// Données de la matrice 4×4 : une cellule par couple (probabilité, gravité),
// avec le nombre de risques qui s'y trouvent — sert à la fois à l'affichage
// et au comptage, sans recalcul côté frontend.
const getMatrice = async (entrepriseId, siteId) => {
  const risques = await prisma.risque.findMany({
    where: { site: { entrepriseId }, ...(siteId && { siteId }) },
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
const genererActionDepuisRisque = async (risqueId) => {
  const risque = await prisma.risque.findUnique({ where: { id: risqueId } });
  if (!risque) throw new ErreurMetier("Risque introuvable.", 404);

  const niveauQualitatif = calculerNiveauQualitatif(risque.niveauRisque);
  if (niveauQualitatif !== "ELEVE" && niveauQualitatif !== "CRITIQUE") {
    throw new ErreurMetier("Seuls les risques élevés ou critiques nécessitent une action de prévention.");
  }

  const existante = await prisma.actionCorrective.findFirst({ where: { risqueId } });
  if (existante) return existante;

  return await prisma.actionCorrective.create({
    data: {
      description:   `Mesure de prévention — ${risque.danger}${risque.zone ? ` (${risque.zone})` : ""}`,
      priorite:      niveauQualitatif, // "ELEVE" ou "CRITIQUE" — mêmes libellés que PrioriteAction
      statut:        "A_FAIRE",
      risqueId,
      responsableId: risque.auteurId,
    },
    include: { responsable: { select: { id: true, nom: true, prenom: true } } },
  });
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
};
