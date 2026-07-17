// Génère le rapport PDF d'un audit : informations générales, score de
// conformité, détail de la checklist et actions correctives générées.
const { getAuditById } = require("./auditService");
const { getActionsByAudit } = require("./actionService");
const pdf = require("./pdfService");

class ErreurMetier extends Error {
  constructor(message, statusCode = 404) {
    super(message);
    this.statusCode = statusCode;
  }
}

const LABELS_TYPE = {
  SECURITE:      "Sécurité",
  QUALITE:       "Qualité",
  ENVIRONNEMENT: "Environnement",
  HYGIENE:       "Hygiène",
};
const LABELS_STATUT_AUDIT = { PLANIFIE: "Planifié", EN_COURS: "En cours", TERMINE: "Terminé", ANNULE: "Annulé" };
const LABELS_CRITICITE    = { CRITIQUE: "Critique", MAJEUR: "Majeur", MINEUR: "Mineur" };
const LABELS_REPONSE      = { CONFORME: "Conforme", NON_CONFORME: "Non conforme", NON_APPLICABLE: "N.A.", NON_REPONDU: "Non répondu" };
const LABELS_PRIORITE     = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé", CRITIQUE: "Critique" };
const LABELS_STATUT_ACTION = { A_FAIRE: "À faire", EN_COURS: "En cours", TERMINE: "Terminé", ANNULE: "Annulé" };

const COULEUR_STATUT_AUDIT = {
  PLANIFIE: pdf.COULEURS.bleu, EN_COURS: pdf.COULEURS.orange,
  TERMINE: pdf.COULEURS.vert, ANNULE: pdf.COULEURS.slateClair,
};
const COULEUR_CRITICITE = { CRITIQUE: pdf.COULEURS.rouge, MAJEUR: pdf.COULEURS.orange, MINEUR: pdf.COULEURS.slateClair };
const COULEUR_REPONSE = {
  CONFORME: pdf.COULEURS.vert, NON_CONFORME: pdf.COULEURS.rouge,
  NON_APPLICABLE: pdf.COULEURS.slateClair, NON_REPONDU: pdf.COULEURS.slateClair,
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

// Dessine une question de la checklist : libellé numéroté, criticité et
// réponse colorées, puis le commentaire s'il s'agit d'une non-conformité.
const dessinerQuestion = (doc, numero, question) => {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(pdf.COULEURS.slateFonce)
    .text(`${numero}. ${question.libelle}`);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(COULEUR_CRITICITE[question.criticite])
    .text(`Criticité : ${LABELS_CRITICITE[question.criticite]}`, { continued: true });
  doc.font("Helvetica").fillColor(pdf.COULEURS.slateClair).text("   —   ", { continued: true });
  doc.font("Helvetica-Bold").fillColor(COULEUR_REPONSE[question.reponse])
    .text(`Réponse : ${LABELS_REPONSE[question.reponse] ?? question.reponse}`);

  if (question.reponse === "NON_CONFORME" && question.commentaire) {
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(pdf.COULEURS.slate)
      .text(`Commentaire : ${question.commentaire}`);
  }
  doc.moveDown(0.5);
};

// Construit le document PDF du rapport d'audit et renvoie { doc, filename }.
const genererRapportAudit = async (auditId) => {
  const audit = await getAuditById(auditId);
  if (!audit) throw new ErreurMetier("Audit introuvable.", 404);

  const actions = await getActionsByAudit(auditId);
  const questions = audit.questions || [];

  const doc = pdf.creerDocument();

  pdf.dessinerEnTete(doc, "Rapport d'audit", audit.reference);

  pdf.dessinerTitreSection(doc, "Informations générales");
  pdf.dessinerLigneInfo(doc, "Titre", audit.titre);
  pdf.dessinerLigneInfo(doc, "Type", LABELS_TYPE[audit.type] ?? audit.type);
  pdf.dessinerLigneInfo(doc, "Site", audit.site?.nom ?? "—");
  pdf.dessinerLigneInfo(doc, "Auditeur", audit.auditeur ? `${audit.auditeur.prenom} ${audit.auditeur.nom}` : "—");
  pdf.dessinerLigneInfo(doc, "Date prévue", formatDate(audit.datePrevue));
  if (audit.dateRealisee) {
    pdf.dessinerLigneInfo(doc, "Date réalisée", formatDate(audit.dateRealisee));
  }
  pdf.dessinerLigneInfoColoree(doc, "Statut", LABELS_STATUT_AUDIT[audit.statut] ?? audit.statut, COULEUR_STATUT_AUDIT[audit.statut]);

  pdf.dessinerScore(doc, audit.scoreConformite);

  const repartition = {
    CONFORME:       questions.filter((q) => q.reponse === "CONFORME").length,
    NON_CONFORME:   questions.filter((q) => q.reponse === "NON_CONFORME").length,
    NON_APPLICABLE: questions.filter((q) => q.reponse === "NON_APPLICABLE").length,
    NON_REPONDU:    questions.filter((q) => q.reponse === "NON_REPONDU").length,
  };
  pdf.dessinerTitreSection(doc, "Récapitulatif");
  pdf.dessinerLigneInfoColoree(doc, "Conformes", String(repartition.CONFORME), pdf.COULEURS.vert);
  pdf.dessinerLigneInfoColoree(doc, "Non-conformités", String(repartition.NON_CONFORME), pdf.COULEURS.rouge);
  pdf.dessinerLigneInfo(doc, "Non applicables", String(repartition.NON_APPLICABLE));
  if (repartition.NON_REPONDU > 0) {
    pdf.dessinerLigneInfo(doc, "Non répondues", String(repartition.NON_REPONDU));
  }

  pdf.dessinerTitreSection(doc, "Détail de la checklist");
  if (questions.length === 0) {
    pdf.dessinerMessageVide(doc, "Aucune question dans cette checklist.");
  } else {
    questions.forEach((q, i) => dessinerQuestion(doc, i + 1, q));
  }

  pdf.dessinerTitreSection(doc, "Actions correctives générées");
  pdf.dessinerTableau(
    doc,
    [
      { label: "Description", largeur: 195 },
      { label: "Priorité",    largeur: 65 },
      { label: "Responsable", largeur: 120 },
      { label: "Statut",      largeur: 115 },
    ],
    actions.map((a) => [
      a.description,
      LABELS_PRIORITE[a.priorite] ?? a.priorite,
      a.responsable ? `${a.responsable.prenom} ${a.responsable.nom}` : "—",
      LABELS_STATUT_ACTION[a.statut] ?? a.statut,
    ])
  );

  pdf.dessinerPiedDePage(doc);

  return { doc, filename: `rapport-${audit.reference}.pdf` };
};

module.exports = { genererRapportAudit };
