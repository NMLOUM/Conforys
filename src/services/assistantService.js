// Service de l'assistant IA conversationnel : construit un résumé chiffré,
// anonyme, des données QHSE de l'entreprise, puis interroge Claude (API
// Anthropic) avec ce résumé en contexte pour répondre aux questions du
// responsable QHSE en langage naturel.
const Anthropic = require("@anthropic-ai/sdk");
const prisma = require("../config/prisma");
const { getIncidentStats } = require("./dashboardService");
const { getHistoriqueScores } = require("./auditService");

class ErreurMetier extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Client Anthropic — une seule instance réutilisée entre les requêtes. La clé
// est lue depuis process.env.ANTHROPIC_API_KEY par le SDK lui-même : jamais
// codée en dur, jamais transmise au frontend.
const client = new Anthropic();

// ── Résumé chiffré de l'entreprise ───────────────────────────────────────────
//
// Construit uniquement à partir d'AGRÉGATS (comptages, taux) — jamais de noms
// de salariés ni de détails identifiants, pour rester conforme à la loi
// sénégalaise 2008-12 sur la protection des données à caractère personnel.
// `dashboardService.getIncidentStats` calcule déjà la plupart de ces KPI :
// on n'en reprend ici que les champs numériques. Ses champs `recents` et
// `alertes` contiennent des noms (déclarants, titulaires d'habilitation...)
// et ne sont volontairement JAMAIS transmis à Claude.
const construireResumeEntreprise = async (entrepriseId) => {
  const stats = await getIncidentStats(entrepriseId);

  // Seul agrégat qui n'existe pas déjà dans dashboardService : les actions
  // correctives en retard (échéance dépassée, pas encore terminées/annulées).
  // Même scope multi-tenant que actionService.getAllActions (une action vient
  // d'un incident, d'un audit OU d'un risque — jamais deux à la fois).
  const actionsCorrectivesEnRetard = await prisma.actionCorrective.count({
    where: {
      OR: [
        { incident: { declarePar: { entrepriseId } } },
        { audit: { auditeur: { entrepriseId } } },
        { risque: { site: { entrepriseId } } },
      ],
      statut: { notIn: ["TERMINE", "ANNULE"] },
      dateLimite: { lt: new Date() },
    },
  });

  // Tendance des scores d'audit : les N derniers audits terminés, dans l'ordre
  // chronologique — permet à l'assistant de juger si la conformité s'améliore
  // ou se dégrade dans le temps, sans exposer autre chose qu'un score et une date.
  const historiqueScores = await getHistoriqueScores(entrepriseId);
  const tendanceScoresAudits = historiqueScores
    .filter((a) => a.score != null)
    .slice(-6)
    .map((a) => `${a.score}%`);

  return {
    incidentsMoisCourant: stats.incidentsMoisCourant,
    evolutionIncidentsPourcent: stats.evolutionIncidents, // % vs mois précédent, null si pas de référence
    incidentsTotal: stats.total,
    incidentsGraves: stats.graves,
    incidentsCritiques: stats.critiques,
    incidentsParMoisSur12Mois: stats.evolutionMensuelle.map((m) => `${m.mois}: ${m.total}`),
    tauxConformiteAudits: stats.tauxConformite,
    tendanceScoresAudits,
    conformiteEpi: stats.conformiteEpi,
    episEnAlerte: stats.episEnAlerte,
    risquesCritiquesDuerp: stats.risquesCritiques,
    risquesTotalDuerp: stats.risquesTotal,
    actionsCorrectivesEnRetard,
    habilitationsAEcheanceSous30Jours: stats.habilitationsExpirantes,
    scoreGlobalSecurite: stats.scoreGlobal,
  };
};

// Met le résumé en forme lisible pour le system prompt — plus fiable qu'un
// JSON brut pour guider les réponses de Claude en langage naturel.
const formaterResumePourPrompt = (resume) => `
Situation actuelle :
- Incidents déclarés ce mois-ci : ${resume.incidentsMoisCourant}${
  resume.evolutionIncidentsPourcent != null
    ? ` (${resume.evolutionIncidentsPourcent >= 0 ? "+" : ""}${resume.evolutionIncidentsPourcent}% vs mois précédent)`
    : ""
}
- Incidents au total : ${resume.incidentsTotal} (dont ${resume.incidentsGraves} graves, ${resume.incidentsCritiques} critiques)
- Taux de conformité des audits : ${resume.tauxConformiteAudits}%
- Conformité du stock EPI : ${resume.conformiteEpi}% (${resume.episEnAlerte} équipement(s) en alerte)
- Risques DUERP : ${resume.risquesTotalDuerp} au total, dont ${resume.risquesCritiquesDuerp} élevés/critiques
- Actions correctives en retard : ${resume.actionsCorrectivesEnRetard}
- Habilitations arrivant à échéance sous 30 jours : ${resume.habilitationsAEcheanceSous30Jours}
- Score global de sécurité : ${resume.scoreGlobalSecurite}/100

Tendances (pour l'analyse d'évolution) :
- Nombre d'incidents par mois, 12 derniers mois : ${resume.incidentsParMoisSur12Mois.join(", ")}
- Scores des ${resume.tendanceScoresAudits.length} derniers audits terminés, du plus ancien au plus récent : ${
  resume.tendanceScoresAudits.length > 0 ? resume.tendanceScoresAudits.join(" → ") : "aucun audit terminé pour l'instant"
}
`.trim();

// ── Appel à Claude ────────────────────────────────────────────────────────────
const poserQuestion = async (question, entrepriseId) => {
  const resume = await construireResumeEntreprise(entrepriseId);
  const systemPrompt = `Tu es un assistant expert QHSE (Qualité, Hygiène, Sécurité, Environnement) intégré à la plateforme CONFORYS.
Tu réponds aux questions du responsable QHSE sur la situation de son entreprise, en français, de façon concise et professionnelle.
Appuie-toi sur les données chiffrées ci-dessous, à jour au moment de la question. Ne mentionne jamais de nom de salarié : ces données sont volontairement agrégées et anonymes.
Si une question porte sur une donnée qui n'apparaît pas ci-dessous, dis-le clairement plutôt que d'inventer un chiffre.

En plus de répondre aux questions factuelles, tu peux aussi :
- Analyser les tendances (section "Tendances" ci-dessous) : dire si les incidents augmentent/diminuent, si la conformité des audits s'améliore ou se dégrade, et depuis quand.
- Donner des recommandations concrètes et priorisées quand on te le demande (ex : "que recommandes-tu ?", "sur quoi dois-je me concentrer ?") — base-toi sur les points les plus critiques du résumé (actions en retard, risques élevés/critiques sans mesure, conformité en baisse). Reste synthétique : 3 recommandations priorisées valent mieux qu'une liste exhaustive.
- Si les données ne permettent pas de conclure sur une tendance (ex. pas assez d'historique), dis-le plutôt que de spéculer.

Données de l'entreprise :
${formaterResumePourPrompt(resume)}`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "medium" },
      system: systemPrompt,
      messages: [{ role: "user", content: question }],
    });

    const texte = response.content.find((b) => b.type === "text")?.text;
    if (!texte) throw new ErreurMetier("L'assistant n'a pas pu générer de réponse.", 502);
    return texte;
  } catch (err) {
    if (err instanceof ErreurMetier) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[ASSISTANT] Clé API Anthropic invalide.");
      throw new ErreurMetier("L'assistant est mal configuré. Contactez un administrateur.", 502);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new ErreurMetier("L'assistant est temporairement surchargé. Réessayez dans quelques instants.", 429);
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[ASSISTANT] Erreur API Anthropic :", err.status, err.message);
      throw new ErreurMetier("L'assistant est momentanément indisponible. Réessayez plus tard.", 502);
    }
    console.error("[ASSISTANT] Erreur inattendue :", err.message || err);
    throw new ErreurMetier("Impossible de contacter l'assistant pour le moment.", 502);
  }
};

const suggererMesuresRisque = async ({ danger, categorie, zone, probabilite, gravite, mesuresPrevention }) => {
  const contexte = [
    `Danger : ${danger}`,
    `Catégorie : ${categorie || "non renseignée"}`,
    `Zone : ${zone || "non renseignée"}`,
    `Probabilité : ${probabilite}/4`,
    `Gravité : ${gravite}/4`,
    mesuresPrevention ? `Mesures déjà prévues : ${mesuresPrevention}` : "Aucune mesure déjà renseignée.",
  ].join("\n");

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 700,
      output_config: { effort: "medium" },
      system: `Tu es un expert QHSE. Propose des mesures de prévention concrètes pour un risque professionnel.
Réponds uniquement en français, sous forme de 3 à 6 lignes courtes, une mesure par ligne, sans puces, sans titre et sans inventer de norme ou de valeur réglementaire.
Les mesures doivent être adaptées au danger, à la zone et à la cotation fournis. Si des mesures existent déjà, propose des compléments plutôt que de les répéter.
Contexte du risque :
${contexte}`,
      messages: [{ role: "user", content: "Propose les mesures de prévention adaptées à ce risque." }],
    });
    const suggestion = response.content.find((bloc) => bloc.type === "text")?.text?.trim();
    if (!suggestion) throw new ErreurMetier("L'assistant n'a pas pu proposer de mesures.", 502);
    return suggestion;
  } catch (err) {
    if (err instanceof ErreurMetier) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new ErreurMetier("L'assistant est mal configuré. Contactez un administrateur.", 502);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new ErreurMetier("L'assistant est temporairement surchargé. Réessayez dans quelques instants.", 429);
    }
    console.error("[ASSISTANT] Erreur suggestion risque :", err.message || err);
    throw new ErreurMetier("Impossible de générer une suggestion pour le moment.", 502);
  }
};

const suggererDepuisContexte = async ({ type, contexte, contenuExistant }) => {
  const consigne = type === "INCIDENT"
    ? "Réécris la description de l'incident de façon factuelle et précise. Inclus les faits observables, le lieu, les conséquences connues et les éléments manquants à vérifier. Réponds en un paragraphe, sans titre."
    : "Propose une description concrète d'action corrective QHSE, avec un résultat attendu mesurable. Réponds en un paragraphe court, sans titre.";
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 500,
      output_config: { effort: "medium" },
      system: `Tu es un rédacteur QHSE. ${consigne}
N'invente aucune information absente du contexte et réponds uniquement en français.
Contexte :
${contexte}
${contenuExistant ? `Contenu déjà saisi :\n${contenuExistant}` : ""}`,
      messages: [{ role: "user", content: "Génère une proposition directement utilisable dans le formulaire." }],
    });
    const suggestion = response.content.find((bloc) => bloc.type === "text")?.text?.trim();
    if (!suggestion) throw new ErreurMetier("L'assistant n'a pas pu générer de proposition.", 502);
    return suggestion;
  } catch (err) {
    if (err instanceof ErreurMetier) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new ErreurMetier("L'assistant est mal configuré. Contactez un administrateur.", 502);
    if (err instanceof Anthropic.RateLimitError) throw new ErreurMetier("L'assistant est temporairement surchargé. Réessayez dans quelques instants.", 429);
    console.error("[ASSISTANT] Erreur suggestion contextuelle :", err.message || err);
    throw new ErreurMetier("Impossible de générer une proposition pour le moment.", 502);
  }
};

module.exports = { poserQuestion, suggererMesuresRisque, suggererDepuisContexte, construireResumeEntreprise };
