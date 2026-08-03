// Génère le rapport PDF du registre DUERP complet : informations générales,
// répartition par niveau, échéance de révision annuelle, puis le détail de
// tous les risques recensés (le DUERP est légalement un document, pas
// seulement une vue web — ce PDF sert d'archive/preuve de conformité).
const { getAllRisques, getStatutRevision } = require("./risqueService");
const pdf = require("./pdfService");

const CATEGORIES = {
  CHUTE: "Chute", ELECTRIQUE: "Électrique", CHIMIQUE: "Chimique", MECANIQUE: "Mécanique",
  INCENDIE: "Incendie", BRUIT: "Bruit", MANUTENTION: "Manutention", THERMIQUE: "Thermique",
  BIOLOGIQUE: "Biologique", AUTRE: "Autre",
};
const LABELS_PROBABILITE = { 1: "Rare", 2: "Possible", 3: "Probable", 4: "Fréquent" };
const LABELS_GRAVITE     = { 1: "Mineure", 2: "Modérée", 3: "Grave", 4: "Critique" };
const LABELS_NIVEAU      = { FAIBLE: "Faible", MODERE: "Modéré", ELEVE: "Élevé", CRITIQUE: "Critique" };
const COULEUR_NIVEAU = {
  FAIBLE: pdf.COULEURS.vert, MODERE: pdf.COULEURS.amber,
  ELEVE: pdf.COULEURS.orange, CRITIQUE: pdf.COULEURS.rouge,
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

// Construit le document PDF du registre DUERP et renvoie { doc, filename }.
const genererRapportRegistre = async (entrepriseId, { siteId } = {}) => {
  const [risques, statutRevision] = await Promise.all([
    getAllRisques(entrepriseId, { siteId }),
    getStatutRevision(entrepriseId),
  ]);

  const doc = pdf.creerDocument();

  pdf.dessinerEnTete(doc, "Document Unique d'Évaluation des Risques Professionnels (DUERP)");

  pdf.dessinerTitreSection(doc, "Suivi de révision");
  pdf.dessinerLigneInfo(doc, "Dernière révision", formatDate(statutRevision.dateDerniereRevision));
  pdf.dessinerLigneInfo(doc, "Prochaine échéance", formatDate(statutRevision.dateProchaineRevision));
  pdf.dessinerLigneInfoColoree(
    doc, "Statut",
    statutRevision.enRetard ? "Révision en retard" : "À jour",
    statutRevision.enRetard ? pdf.COULEURS.rouge : pdf.COULEURS.vert
  );

  const repartition = { FAIBLE: 0, MODERE: 0, ELEVE: 0, CRITIQUE: 0 };
  risques.forEach((r) => { if (r.niveauQualitatif) repartition[r.niveauQualitatif]++; });

  pdf.dessinerTitreSection(doc, "Récapitulatif");
  pdf.dessinerLigneInfo(doc, "Risques recensés", String(risques.length));
  pdf.dessinerLigneInfoColoree(doc, "Faible",   String(repartition.FAIBLE),   COULEUR_NIVEAU.FAIBLE);
  pdf.dessinerLigneInfoColoree(doc, "Modéré",   String(repartition.MODERE),   COULEUR_NIVEAU.MODERE);
  pdf.dessinerLigneInfoColoree(doc, "Élevé",    String(repartition.ELEVE),    COULEUR_NIVEAU.ELEVE);
  pdf.dessinerLigneInfoColoree(doc, "Critique", String(repartition.CRITIQUE), COULEUR_NIVEAU.CRITIQUE);

  pdf.dessinerTitreSection(doc, "Registre des risques");
  pdf.dessinerTableau(
    doc,
    [
      { label: "Danger",    largeur: 100 },
      { label: "Catégorie", largeur: 65 },
      { label: "Site/Zone", largeur: 90 },
      { label: "Prob.",     largeur: 45 },
      { label: "Grav.",     largeur: 45 },
      { label: "Niveau",    largeur: 60 },
      { label: "Résiduel",  largeur: 60 },
      { label: "Mesures",   largeur: 30 },
    ],
    risques.map((r) => [
      r.danger,
      CATEGORIES[r.categorie] ?? r.categorie,
      [r.site?.nom, r.zone].filter(Boolean).join(" · "),
      LABELS_PROBABILITE[r.probabilite],
      LABELS_GRAVITE[r.gravite],
      LABELS_NIVEAU[r.niveauQualitatif] ?? "—",
      LABELS_NIVEAU[r.niveauQualitatifResiduel] ?? "—",
      r.mesuresPrevention ? "Oui" : "—",
    ])
  );

  pdf.dessinerPiedDePage(doc);

  const suffixe = siteId ? "-site" : "";
  return { doc, filename: `duerp-registre${suffixe}-${new Date().toISOString().slice(0, 10)}.pdf` };
};

module.exports = { genererRapportRegistre };
