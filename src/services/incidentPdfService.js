// Génère le rapport PDF d'un incident : assemble les données (incident, actions
// correctives, piste d'audit) puis délègue le dessin à pdfService (mutualisé).
const { getIncidentById } = require("./incidentService");
const { getActionsByIncident } = require("./actionService");
const { getHistoriqueByIncident } = require("./historiqueService");
const pdf = require("./pdfService");

class ErreurMetier extends Error {
  constructor(message, statusCode = 404) {
    super(message);
    this.statusCode = statusCode;
  }
}

const LABELS_TYPE = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presqu'accident",
  SITUATION_DANGEREUSE:     "Situation dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Incident environnemental",
};
const LABELS_GRAVITE  = { FAIBLE: "Faible", MOYEN: "Moyen", GRAVE: "Grave", CRITIQUE: "Critique" };
const LABELS_STATUT   = { BROUILLON: "Brouillon", OUVERT: "Ouvert", EN_COURS: "En cours", CLOS: "Clôturé", REJETE: "Rejeté" };
const LABELS_PRIORITE = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé", CRITIQUE: "Critique" };
const LABELS_STATUT_ACTION = { A_FAIRE: "À faire", EN_COURS: "En cours", TERMINE: "Terminé", ANNULE: "Annulé" };

const COULEUR_GRAVITE = {
  FAIBLE: pdf.COULEURS.vert, MOYEN: pdf.COULEURS.amber,
  GRAVE: pdf.COULEURS.orange, CRITIQUE: pdf.COULEURS.rouge,
};
const COULEUR_STATUT = {
  BROUILLON: pdf.COULEURS.slateClair, OUVERT: pdf.COULEURS.bleu,
  EN_COURS: pdf.COULEURS.orange, CLOS: pdf.COULEURS.vert, REJETE: pdf.COULEURS.rouge,
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
const formatDateHeure = (d) => (d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—");

// Construit le document PDF du rapport d'incident et renvoie { doc, filename }.
// Le PDF est entièrement généré en mémoire (aucun fichier écrit sur le serveur) —
// seules les données strictement nécessaires au rapport sont extraites.
const genererRapportIncident = async (incidentId) => {
  const incident = await getIncidentById(incidentId);
  if (!incident) throw new ErreurMetier("Incident introuvable.", 404);

  const [actions, historique] = await Promise.all([
    getActionsByIncident(incidentId),
    getHistoriqueByIncident(incidentId),
  ]);

  const doc = pdf.creerDocument();

  pdf.dessinerEnTete(doc, "Rapport d'incident", incident.numeroReference);

  pdf.dessinerTitreSection(doc, "Informations générales");
  pdf.dessinerLigneInfo(doc, "Type", LABELS_TYPE[incident.type] ?? incident.type);
  pdf.dessinerLigneInfoColoree(doc, "Gravité", LABELS_GRAVITE[incident.gravite], COULEUR_GRAVITE[incident.gravite]);
  pdf.dessinerLigneInfoColoree(doc, "Statut", LABELS_STATUT[incident.statut], COULEUR_STATUT[incident.statut]);
  pdf.dessinerLigneInfo(doc, "Date de l'incident", formatDate(incident.dateIncident));
  pdf.dessinerLigneInfo(doc, "Site", incident.site?.nom ?? "—");
  pdf.dessinerLigneInfo(doc, "Déclarant", incident.declarePar ? `${incident.declarePar.prenom} ${incident.declarePar.nom}` : "—");
  if (incident.validePar) {
    pdf.dessinerLigneInfo(doc, "Validé par", `${incident.validePar.prenom} ${incident.validePar.nom}`);
  }
  if (incident.adresseLisible) {
    pdf.dessinerLigneInfo(doc, "Lieu précis", incident.adresseLisible);
  }
  if (incident.latitude != null && incident.longitude != null) {
    pdf.dessinerLigneInfo(doc, "Coordonnées GPS", `${incident.latitude}, ${incident.longitude}`);
  }
  if (incident.motifRejet) {
    pdf.dessinerLigneInfoColoree(doc, "Motif de rejet", incident.motifRejet, pdf.COULEURS.rouge);
  }

  pdf.dessinerTitreSection(doc, "Description");
  pdf.dessinerParagraphe(doc, incident.description);

  pdf.dessinerTitreSection(doc, "Actions correctives");
  pdf.dessinerTableau(
    doc,
    [
      { label: "Description",  largeur: 185 },
      { label: "Priorité",     largeur: 60 },
      { label: "Responsable",  largeur: 110 },
      { label: "Statut",       largeur: 70 },
      { label: "Échéance",     largeur: 70 },
    ],
    actions.map((a) => [
      a.description,
      LABELS_PRIORITE[a.priorite] ?? a.priorite,
      a.responsable ? `${a.responsable.prenom} ${a.responsable.nom}` : "—",
      LABELS_STATUT_ACTION[a.statut] ?? a.statut,
      a.dateLimite ? formatDate(a.dateLimite) : "—",
    ])
  );

  pdf.dessinerTitreSection(doc, "Piste d'audit");
  pdf.dessinerTableau(
    doc,
    [
      { label: "Date",   largeur: 95 },
      { label: "Auteur", largeur: 130 },
      { label: "Action", largeur: 270 },
    ],
    historique.map((h) => [
      formatDateHeure(h.dateAction),
      h.auteur ? `${h.auteur.prenom} ${h.auteur.nom}` : "—",
      h.details ? `${h.action} — ${h.details}` : h.action,
    ])
  );

  pdf.dessinerPiedDePage(doc);

  return { doc, filename: `rapport-${incident.numeroReference}.pdf` };
};

module.exports = { genererRapportIncident };
