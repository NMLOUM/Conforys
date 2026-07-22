const prisma = require("../config/prisma");
const { calculerNiveauAlerte } = require("./epiService");

const getIncidentStats = async () => {
  const MOIS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];

  // Bornes de temps
  const maintenant   = new Date();
  const dans7Jours   = new Date(); dans7Jours.setDate(maintenant.getDate() + 7);
  const dans30Jours  = new Date(); dans30Jours.setDate(maintenant.getDate() + 30);
  const debutMois    = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutMoisPrec = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
  const finMoisPrec  = new Date(debutMois.getTime() - 1);
  const debut12Mois  = new Date(); debut12Mois.setMonth(debut12Mois.getMonth() - 11); debut12Mois.setDate(1); debut12Mois.setHours(0,0,0,0);

  // Toutes les requêtes en parallèle
  const [
    total, parGravite, parStatut, parType,
    incidentsMoisCourant, incidentsMoisPrec,
    recents, incidents12Mois,
    tousEpis,
    totalAudits, auditsTermines,
    auditsMoisCourant,
    auditsEnRetard,
    incidentsGravesOuverts,
    habExpirantesCount,
    habExpirantes7j,
  ] = await Promise.all([
    prisma.incident.count(),
    prisma.incident.groupBy({ by: ["gravite"], _count: { gravite: true } }),
    prisma.incident.groupBy({ by: ["statut"],  _count: { statut:  true } }),
    prisma.incident.groupBy({ by: ["type"],    _count: { type:    true } }),
    prisma.incident.count({ where: { dateDeclaration: { gte: debutMois } } }),
    prisma.incident.count({ where: { dateDeclaration: { gte: debutMoisPrec, lte: finMoisPrec } } }),
    prisma.incident.findMany({
      take: 5, orderBy: { dateDeclaration: "desc" },
      select: {
        id: true, numeroReference: true, gravite: true, type: true,
        statut: true, dateIncident: true,
        site:       { select: { nom: true } },
        declarePar: { select: { nom: true, prenom: true } },
      },
    }),
    prisma.incident.findMany({
      where: { dateIncident: { gte: debut12Mois } },
      select: { dateIncident: true, type: true },
    }),
    prisma.epi.findMany({
      select: {
        id: true, designation: true, quantite: true, seuilAlerte: true,
        datePeremption: true, statut: true, frequenceInspectionJours: true,
        inspections: { orderBy: { dateInspection: "desc" }, take: 1, select: { dateInspection: true } },
        site: { select: { nom: true } },
      },
    }),
    prisma.audit.count(),
    prisma.audit.count({ where: { statut: "TERMINE" } }),
    prisma.audit.count({ where: { statut: "TERMINE", dateRealisee: { gte: debutMois } } }),
    prisma.audit.findMany({
      where: { statut: "PLANIFIE", datePrevue: { lt: maintenant } },
      select: { id: true, titre: true, datePrevue: true, site: { select: { nom: true } } },
    }),
    prisma.incident.findMany({
      where: { statut: { in: ["OUVERT", "EN_COURS"] }, gravite: { in: ["GRAVE", "CRITIQUE"] } },
      select: {
        id: true, numeroReference: true, gravite: true, statut: true,
        dateIncident: true, site: { select: { nom: true } },
      },
    }),
    prisma.habilitation.count({ where: { dateExpiration: { gte: maintenant, lte: dans30Jours } } }),
    prisma.habilitation.findMany({
      where: { dateExpiration: { gte: maintenant, lte: dans7Jours } },
      select: {
        id: true, intitule: true, dateExpiration: true,
        titulaire: { select: { nom: true, prenom: true } },
      },
      orderBy: { dateExpiration: "asc" },
    }),
  ]);

  // ── KPIs dérivés ──────────────────────────────────────────────
  const critiques   = parGravite.find((g) => g.gravite === "CRITIQUE")?._count?.gravite ?? 0;
  const graves      = parGravite.find((g) => g.gravite === "GRAVE")?._count?.gravite ?? 0;
  const episAnnotes  = tousEpis.map((e) => ({ ...e, niveauAlerte: calculerNiveauAlerte(e) }));
  const episOk       = episAnnotes.filter((e) => e.niveauAlerte === "OK").length;
  const episEnAlerte = episAnnotes.length - episOk;
  const conformiteEpi    = tousEpis.length > 0 ? Math.round((episOk / tousEpis.length) * 100) : 100;
  const tauxConformite   = totalAudits   > 0 ? Math.round((auditsTermines / totalAudits) * 100) : 0;
  const evolutionMensuelle12 = calculerEvolution12Mois(incidents12Mois, MOIS);

  // ── Score global de sécurité ──────────────────────────────────
  const scoreAudits    = tauxConformite;
  const scoreEpi       = conformiteEpi;
  const scoreIncidents = total > 0 ? Math.round(Math.max(0, (1 - (critiques + graves) / total)) * 100) : 100;
  const scoreGlobal    = Math.round(scoreAudits * 0.4 + scoreEpi * 0.3 + scoreIncidents * 0.3);

  // ── Évolution vs mois précédent ────────────────────────────────
  const evolutionIncidents = incidentsMoisPrec > 0
    ? Math.round(((incidentsMoisCourant - incidentsMoisPrec) / incidentsMoisPrec) * 100)
    : null;

  // ── Alertes critiques ─────────────────────────────────────────
  const alertes = [];

  // EPI en alerte (rupture de stock, péremption dépassée, ou inspection en
  // retard — même calcul que la page EPI, via epiService.calculerNiveauAlerte)
  episAnnotes
    .filter((e) => e.niveauAlerte === "ALERTE")
    .forEach((e) => {
      const perime = e.datePeremption && new Date(e.datePeremption) < maintenant;
      const enRupture = e.quantite <= e.seuilAlerte;
      let alerte;
      if (perime) {
        alerte = {
          categorie: "EPI_PERIME",
          message: `${e.designation} — périmé depuis le ${new Date(e.datePeremption).toLocaleDateString("fr-FR")}`,
        };
      } else if (enRupture) {
        alerte = {
          categorie: "EPI_STOCK",
          message: `${e.designation} — ${e.quantite} restant(s) (seuil : ${e.seuilAlerte})`,
        };
      } else {
        alerte = { categorie: "EPI_INSPECTION", message: `${e.designation} — inspection en retard` };
      }
      alertes.push({ niveau: "CRITIQUE", ...alerte, detail: e.site?.nom });
    });

  // EPI qui périment bientôt (dans les 30 jours, pas encore dépassé) — simple
  // avertissement, distinct des alertes ci-dessus qui sont déjà critiques
  tousEpis
    .filter((e) => e.datePeremption && new Date(e.datePeremption) <= dans30Jours && new Date(e.datePeremption) >= maintenant)
    .forEach((e) => alertes.push({
      niveau: "AVERTISSEMENT",
      categorie: "EPI_PERIME",
      message: `${e.designation} — périme le ${new Date(e.datePeremption).toLocaleDateString("fr-FR")}`,
      detail: e.site?.nom,
    }));

  // Habilitations expirant dans < 7 jours
  habExpirantes7j.forEach((h) => alertes.push({
    niveau: "CRITIQUE",
    categorie: "HABILITATION",
    message: `${h.intitule} — ${h.titulaire?.prenom} ${h.titulaire?.nom}`,
    detail: `Expire le ${new Date(h.dateExpiration).toLocaleDateString("fr-FR")}`,
  }));

  // Audits planifiés non réalisés (date dépassée)
  auditsEnRetard.forEach((a) => alertes.push({
    niveau: "AVERTISSEMENT",
    categorie: "AUDIT_RETARD",
    message: `Audit non réalisé — ${a.titre}`,
    detail: `Prévu le ${new Date(a.datePrevue).toLocaleDateString("fr-FR")} · ${a.site?.nom}`,
  }));

  // Incidents graves ou critiques non clôturés
  incidentsGravesOuverts.forEach((i) => alertes.push({
    niveau: "CRITIQUE",
    categorie: "INCIDENT_GRAVE",
    message: `${i.numeroReference} — ${i.gravite} non clôturé`,
    detail: `${i.site?.nom} · ${new Date(i.dateIncident).toLocaleDateString("fr-FR")}`,
  }));

  return {
    // Score
    scoreGlobal,
    // KPIs mois
    incidentsMoisCourant,
    evolutionIncidents,
    auditsMoisCourant,
    conformiteEpi,
    // KPIs globaux
    total, critiques, episEnAlerte, tauxConformite,
    habilitationsExpirantes: habExpirantesCount,
    // Graphiques
    parGravite, parStatut, parType,
    evolutionMensuelle: evolutionMensuelle12,
    // Données brutes
    recents,
    alertes,
  };
};

function calculerEvolution12Mois(incidents, MOIS) {
  const TYPES_COULEUR = ["ACCIDENT", "PRESQU_ACCIDENT", "SITUATION_DANGEREUSE", "INCIDENT_ENVIRONNEMENTAL"];
  const carte = {};

  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const label = `${MOIS[d.getMonth()]} ${d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() : ""}`.trim();
    carte[label] = { mois: label, total: 0 };
    TYPES_COULEUR.forEach((t) => { carte[label][t] = 0; });
  }

  incidents.forEach((inc) => {
    const d     = new Date(inc.dateIncident);
    const moisN = new Date(); moisN.setMonth(moisN.getMonth() - 11); moisN.setDate(1);
    if (d < moisN) return;
    const label = `${MOIS[d.getMonth()]} ${d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() : ""}`.trim();
    if (carte[label]) {
      carte[label].total++;
      if (inc.type in carte[label]) carte[label][inc.type]++;
    }
  });

  return Object.values(carte);
}

module.exports = { getIncidentStats };
