// Rapport de synthèse QHSE sur une période donnée (bilan destiné à la
// direction). Contrairement aux rapports incident/audit qui documentent un
// enregistrement précis, ce service AGRÈGE plusieurs sources (incidents,
// audits, actions correctives, EPI, habilitations) sur un intervalle de
// dates, puis délègue tout le dessin à pdfService (mutualisé).
const prisma = require("../config/prisma");
const pdf = require("./pdfService");
const { calculerNiveauAlerte } = require("./epiService");

const LABELS_GRAVITE  = { FAIBLE: "Faible", MOYEN: "Moyen", GRAVE: "Grave", CRITIQUE: "Critique" };
const LABELS_STATUT_INCIDENT = { BROUILLON: "Brouillon", OUVERT: "Ouvert", EN_COURS: "En cours", CLOS: "Clôturé", REJETE: "Rejeté" };
const LABELS_PRIORITE = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé", CRITIQUE: "Critique" };

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

// Reprend exactement la définition du "retard" utilisée côté frontend
// (ActionsPage.jsx) : une échéance dépassée sur une action non terminée/annulée.
const estEnRetard = (a) =>
  a.dateLimite &&
  new Date(a.dateLimite) < new Date() &&
  a.statut !== "TERMINE" &&
  a.statut !== "ANNULE";

const couleurTaux = (valeur) => {
  if (valeur == null) return pdf.COULEURS.slateClair;
  return valeur >= 75 ? pdf.COULEURS.vert : valeur >= 50 ? pdf.COULEURS.orange : pdf.COULEURS.rouge;
};

// Construit le PDF de synthèse et renvoie { doc, filename }. Toutes les
// requêtes sont scopées à l'entreprise du demandeur (isolation multi-tenant,
// même principe que getAllIncidents/getAllActions), avec un filtre optionnel
// par site.
const genererSynthese = async ({ dateDebut, dateFin, siteId, entrepriseId }) => {
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  fin.setHours(23, 59, 59, 999); // inclut toute la journée de fin de période

  const maintenant  = new Date();
  const dans30Jours = new Date();
  dans30Jours.setDate(dans30Jours.getDate() + 30);

  const [site, incidents, auditsTermines, actionsPeriode, epis, habilitationsExpirantes] = await Promise.all([
    siteId ? prisma.site.findUnique({ where: { id: siteId }, select: { nom: true } }) : null,

    prisma.incident.findMany({
      where: {
        dateIncident: { gte: debut, lte: fin },
        declarePar: { entrepriseId },
        ...(siteId && { siteId }),
      },
      include: { site: { select: { nom: true } } },
      orderBy: { dateIncident: "desc" },
    }),

    prisma.audit.findMany({
      where: {
        statut: "TERMINE",
        dateRealisee: { gte: debut, lte: fin },
        auditeur: { entrepriseId },
        ...(siteId && { siteId }),
      },
      include: { site: { select: { nom: true } } },
      orderBy: { dateRealisee: "desc" },
    }),

    prisma.actionCorrective.findMany({
      where: {
        createdAt: { gte: debut, lte: fin },
        OR: [
          { incident: { declarePar: { entrepriseId } } },
          { audit: { auditeur: { entrepriseId } } },
        ],
      },
      include: { responsable: { select: { nom: true, prenom: true } } },
      orderBy: { dateLimite: "asc" },
    }),

    // EPI et habilitations sont des instantanés de l'état actuel (pas
    // historisés par date), comme sur le tableau de bord — pas de filtre période.
    prisma.epi.findMany({
      where: { site: { entrepriseId }, ...(siteId && { siteId }) },
      include: { inspections: { orderBy: { dateInspection: "desc" }, take: 1, select: { dateInspection: true } } },
    }),

    // Les habilitations n'ont pas de rattachement à un site dans le modèle
    // de données (seulement à un titulaire) : le filtre siteId ne s'y applique
    // donc pas, uniquement l'isolation par entreprise.
    prisma.habilitation.findMany({
      where: {
        dateExpiration: { gte: maintenant, lte: dans30Jours },
        titulaire: { entrepriseId },
      },
      include: { titulaire: { select: { nom: true, prenom: true } } },
    }),
  ]);

  // ── Agrégation des KPI ────────────────────────────────────────────────────
  const parGravite = { FAIBLE: 0, MOYEN: 0, GRAVE: 0, CRITIQUE: 0 };
  const parStatut  = { BROUILLON: 0, OUVERT: 0, EN_COURS: 0, CLOS: 0, REJETE: 0 };
  incidents.forEach((i) => { parGravite[i.gravite]++; parStatut[i.statut]++; });

  const scores = auditsTermines.map((a) => a.scoreConformite).filter((s) => s != null);
  const tauxConformiteMoyen = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const episEnAlerte  = epis.filter((e) => calculerNiveauAlerte(e) === "ALERTE").length;
  const actionsTerminees = actionsPeriode.filter((a) => a.statut === "TERMINE").length;
  const actionsEnRetard  = actionsPeriode.filter(estEnRetard);

  // ── Construction du PDF ───────────────────────────────────────────────────
  const nomSite = siteId ? (site?.nom ?? "Site") : "Tous les sites";
  const doc = pdf.creerDocument();

  pdf.dessinerEnTete(doc, "Bilan de sécurité", `Du ${formatDate(debut)} au ${formatDate(fin)} · ${nomSite}`);

  pdf.dessinerTitreSection(doc, "Indicateurs clés");
  pdf.dessinerLigneInfo(doc, "Total incidents", String(incidents.length));
  pdf.dessinerLigneInfoColoree(
    doc, "Incidents critiques", String(parGravite.CRITIQUE),
    parGravite.CRITIQUE > 0 ? pdf.COULEURS.rouge : pdf.COULEURS.vert
  );
  pdf.dessinerLigneInfo(doc, "Répartition par gravité",
    `Faible ${parGravite.FAIBLE}  ·  Moyen ${parGravite.MOYEN}  ·  Grave ${parGravite.GRAVE}  ·  Critique ${parGravite.CRITIQUE}`);
  pdf.dessinerLigneInfo(doc, "Répartition par statut",
    `Ouverts ${parStatut.OUVERT}  ·  En cours ${parStatut.EN_COURS}  ·  Clos ${parStatut.CLOS}  ·  Rejetés ${parStatut.REJETE}`);
  pdf.dessinerLigneInfo(doc, "Audits réalisés", String(auditsTermines.length));
  pdf.dessinerLigneInfoColoree(
    doc, "Taux de conformité moyen",
    tauxConformiteMoyen != null ? `${tauxConformiteMoyen}%` : "—",
    couleurTaux(tauxConformiteMoyen)
  );
  pdf.dessinerLigneInfo(doc, "Actions correctives", `${actionsPeriode.length} au total  ·  ${actionsTerminees} terminée(s)`);
  pdf.dessinerLigneInfoColoree(
    doc, "Actions en retard", String(actionsEnRetard.length),
    actionsEnRetard.length > 0 ? pdf.COULEURS.rouge : pdf.COULEURS.vert
  );
  pdf.dessinerLigneInfoColoree(
    doc, "EPI en alerte", String(episEnAlerte),
    episEnAlerte > 0 ? pdf.COULEURS.orange : pdf.COULEURS.vert
  );
  pdf.dessinerLigneInfoColoree(
    doc, "Habilitations expirant bientôt (30 j.)", String(habilitationsExpirantes.length),
    habilitationsExpirantes.length > 0 ? pdf.COULEURS.orange : pdf.COULEURS.vert
  );

  pdf.dessinerTitreSection(doc, "Incidents de la période");
  pdf.dessinerTableau(
    doc,
    [
      { label: "Référence", largeur: 95 },
      { label: "Date",      largeur: 75 },
      { label: "Gravité",   largeur: 85 },
      { label: "Statut",    largeur: 85 },
      { label: "Site",      largeur: 155 },
    ],
    incidents.map((i) => [
      i.numeroReference,
      formatDate(i.dateIncident),
      LABELS_GRAVITE[i.gravite] ?? i.gravite,
      LABELS_STATUT_INCIDENT[i.statut] ?? i.statut,
      i.site?.nom ?? "—",
    ])
  );

  pdf.dessinerTitreSection(doc, "Audits réalisés sur la période");
  pdf.dessinerTableau(
    doc,
    [
      { label: "Référence",     largeur: 110 },
      { label: "Date réalisée", largeur: 100 },
      { label: "Score",         largeur: 80 },
      { label: "Site",          largeur: 205 },
    ],
    auditsTermines.map((a) => [
      a.reference,
      formatDate(a.dateRealisee),
      a.scoreConformite != null ? `${a.scoreConformite}%` : "—",
      a.site?.nom ?? "—",
    ])
  );

  pdf.dessinerTitreSection(doc, "Actions correctives en retard");
  pdf.dessinerTableau(
    doc,
    [
      { label: "Description",  largeur: 210 },
      { label: "Priorité",     largeur: 70 },
      { label: "Responsable",  largeur: 120 },
      { label: "Échéance",     largeur: 95 },
    ],
    actionsEnRetard.map((a) => [
      a.description,
      LABELS_PRIORITE[a.priorite] ?? a.priorite,
      a.responsable ? `${a.responsable.prenom} ${a.responsable.nom}` : "—",
      formatDate(a.dateLimite),
    ])
  );

  pdf.dessinerPiedDePage(doc);

  const nomFichier = `bilan-securite-${dateDebut}-au-${dateFin}.pdf`;
  return { doc, filename: nomFichier };
};

module.exports = { genererSynthese };
