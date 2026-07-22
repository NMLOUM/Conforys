require("dotenv").config();
const { PrismaClient } = require("./src/generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const r = (prefix, n) => `${prefix}-2026-${String(n).padStart(4, "0")}`;

async function main() {
  console.log("Nettoyage de la base...");
  // Ordre inverse des FK
  await prisma.habilitation.deleteMany();
  await prisma.progressionModule.deleteMany();
  await prisma.reponseQuiz.deleteMany();
  await prisma.questionQuiz.deleteMany();
  await prisma.lecon.deleteMany();
  await prisma.moduleFormation.deleteMany();
  await prisma.formation.deleteMany();
  await prisma.audit.deleteMany();
  await prisma.epi.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.user.deleteMany();
  await prisma.site.deleteMany();
  await prisma.entreprise.deleteMany();
  console.log("Base nettoyée.\n");

  // ── ENTREPRISE ────────────────────────────────────────────────────────────
  const entreprise = await prisma.entreprise.create({
    data: {
      nom:     "PETROMER SÉNÉGAL SA",
      secteur: "Pétrole et Gaz",
      adresse: "Zone industrielle de Mbao, Dakar",
    },
  });
  console.log("Entreprise créée :", entreprise.nom);

  // ── SITES ─────────────────────────────────────────────────────────────────
  const [siteDakar, siteThies, siteStLouis] = await Promise.all([
    prisma.site.create({ data: { nom: "Raffinerie de Mbao",      adresse: "Zone industrielle de Mbao", ville: "Dakar",      entrepriseId: entreprise.id } }),
    prisma.site.create({ data: { nom: "Dépôt de Thiès",          adresse: "Route de Dakar",            ville: "Thiès",      entrepriseId: entreprise.id } }),
    prisma.site.create({ data: { nom: "Terminal de Saint-Louis", adresse: "Quai industriel Nord",      ville: "Saint-Louis", entrepriseId: entreprise.id } }),
  ]);
  console.log("Sites créés : 3");

  // ── UTILISATEURS ──────────────────────────────────────────────────────────
  const h = (pwd) => bcrypt.hash(pwd, 10);

  const [admin, resp1, resp2, emp1, emp2, emp3] = await Promise.all([
    prisma.user.create({ data: { nom: "DIALLO",  prenom: "Mamadou", email: "m.diallo@petromer.sn",  password: await h("Admin123!"),    role: "ADMIN",            entrepriseId: entreprise.id } }),
    prisma.user.create({ data: { nom: "NDIAYE",  prenom: "Fatou",   email: "f.ndiaye@petromer.sn",  password: await h("Qhse2026!"),    role: "RESPONSABLE_QHSE", entrepriseId: entreprise.id } }),
    prisma.user.create({ data: { nom: "SOW",     prenom: "Ibrahima",email: "i.sow@petromer.sn",     password: await h("Qhse2026!"),    role: "RESPONSABLE_QHSE", entrepriseId: entreprise.id } }),
    prisma.user.create({ data: { nom: "FALL",    prenom: "Cheikh",  email: "c.fall@petromer.sn",    password: await h("Employe123!"),  role: "EMPLOYE",          entrepriseId: entreprise.id } }),
    prisma.user.create({ data: { nom: "SARR",    prenom: "Aminata", email: "a.sarr@petromer.sn",    password: await h("Employe123!"),  role: "EMPLOYE",          entrepriseId: entreprise.id } }),
    prisma.user.create({ data: { nom: "MBAYE",   prenom: "Moussa",  email: "m.mbaye@petromer.sn",   password: await h("Employe123!"),  role: "EMPLOYE",          entrepriseId: entreprise.id } }),
  ]);
  console.log("Utilisateurs créés : 6");

  // ── INCIDENTS ─────────────────────────────────────────────────────────────
  await prisma.incident.createMany({
    data: [
      {
        numeroReference: r("INC", 1),
        type:           "ACCIDENT",
        description:    "Opérateur glissé sur sol mouillé dans l'atelier de pompage. Blessure au genou droit.",
        gravite:        "GRAVE",
        adresseLisible: "Atelier de pompage — Bâtiment B, Raffinerie de Mbao",
        dateIncident:   new Date("2026-01-15T08:30:00"),
        statut:         "CLOS",
        declareParId:   emp1.id,
        siteId:         siteDakar.id,
      },
      {
        numeroReference: r("INC", 2),
        type:           "PRESQU_ACCIDENT",
        description:    "Chute de matériel (clé de 3 kg) depuis l'échafaudage niveau 2. Aucun blessé.",
        gravite:        "MOYEN",
        adresseLisible: "Tour de distillation — Niveau 2, Raffinerie de Mbao",
        dateIncident:   new Date("2026-02-03T14:00:00"),
        statut:         "CLOS",
        declareParId:   emp2.id,
        siteId:         siteDakar.id,
      },
      {
        numeroReference: r("INC", 3),
        type:           "SITUATION_DANGEREUSE",
        description:    "Fuite de gaz détectée sur la canalisation principale. Zone évacuée immédiatement.",
        gravite:        "CRITIQUE",
        adresseLisible: "Zone de stockage GNL, Raffinerie de Mbao",
        dateIncident:   new Date("2026-02-20T06:45:00"),
        statut:         "EN_COURS",
        declareParId:   resp1.id,
        siteId:         siteDakar.id,
      },
      {
        numeroReference: r("INC", 4),
        type:           "ACCIDENT",
        description:    "Contact avec surface chaude lors de la maintenance. Brûlure légère à la main droite.",
        gravite:        "FAIBLE",
        adresseLisible: "Salle de contrôle, Dépôt de Thiès",
        dateIncident:   new Date("2026-03-10T10:15:00"),
        statut:         "CLOS",
        declareParId:   emp3.id,
        siteId:         siteThies.id,
      },
      {
        numeroReference: r("INC", 5),
        type:           "INCIDENT_ENVIRONNEMENTAL",
        description:    "Déversement mineur d'huile hydraulique lors d'une opération de vidange. Sol contaminé ~2 m².",
        gravite:        "MOYEN",
        adresseLisible: "Aire de maintenance, Dépôt de Thiès",
        dateIncident:   new Date("2026-04-02T09:30:00"),
        statut:         "EN_COURS",
        declareParId:   emp3.id,
        siteId:         siteThies.id,
      },
      {
        numeroReference: r("INC", 6),
        type:           "PRESQU_ACCIDENT",
        description:    "Véhicule de livraison a failli percuter un piéton dans la zone de chargement.",
        gravite:        "GRAVE",
        adresseLisible: "Zone de chargement — Terminal de Saint-Louis",
        dateIncident:   new Date("2026-04-08T16:30:00"),
        statut:         "OUVERT",
        declareParId:   emp1.id,
        siteId:         siteStLouis.id,
      },
      {
        numeroReference: r("INC", 7),
        type:           "SITUATION_DANGEREUSE",
        description:    "Absence de signalisation autour d'une tranchée ouverte dans la zone piétonne.",
        gravite:        "MOYEN",
        adresseLisible: "Allée centrale, Raffinerie de Mbao",
        dateIncident:   new Date("2026-05-14T11:00:00"),
        statut:         "BROUILLON",
        declareParId:   emp2.id,
        siteId:         siteDakar.id,
      },
    ],
  });
  console.log("Incidents créés : 7");

  // ── EPI ───────────────────────────────────────────────────────────────────
  // Certains volontairement sous le seuil d'alerte pour tester /alertes
  await prisma.epi.createMany({
    data: [
      { designation: "Casque de protection classe E",   type: "Protection crânienne",       quantite: 8,   seuilAlerte: 15, statut: "EN_RUPTURE", siteId: siteDakar.id },
      { designation: "Gants anti-coupure niveau 4",     type: "Protection des mains",       quantite: 45,  seuilAlerte: 20, statut: "DISPONIBLE", siteId: siteDakar.id },
      { designation: "Chaussures de sécurité S3",       type: "Protection des pieds",       quantite: 4,   seuilAlerte: 10, statut: "EN_RUPTURE", siteId: siteDakar.id },
      { designation: "Lunettes de protection anti-UV",  type: "Protection oculaire",        quantite: 30,  seuilAlerte: 10, statut: "DISPONIBLE", siteId: siteThies.id },
      { designation: "Masque anti-gaz FFP3",            type: "Protection respiratoire",    quantite: 5,   seuilAlerte: 20, statut: "EN_RUPTURE", siteId: siteThies.id },
      { designation: "Gilet haute visibilité classe 3", type: "Vêtement de signalisation",  quantite: 22,  seuilAlerte: 10, statut: "DISPONIBLE", siteId: siteStLouis.id },
      { designation: "Harnais anti-chute certifié",     type: "Protection contre les chutes", quantite: 3, seuilAlerte: 5,  statut: "EN_RUPTURE", siteId: siteStLouis.id },
      { designation: "Protège-oreilles SNR 33dB",       type: "Protection auditive",        quantite: 60,  seuilAlerte: 15, statut: "DISPONIBLE", siteId: siteDakar.id },
    ],
  });
  console.log("EPI créés : 8 (4 en alerte de stock)");

  // ── AUDITS ────────────────────────────────────────────────────────────────
  await prisma.audit.createMany({
    data: [
      {
        reference:   r("AUD", 1),
        titre:       "Audit sécurité incendie — Raffinerie Q1",
        type:        "SECURITE",
        statut:      "TERMINE",
        datePrevue:  new Date("2026-01-20"),
        dateRealisee: new Date("2026-01-22"),
        scoreConformite: 87.5,
        observations: "Bonne conformité générale. Points d'amélioration identifiés sur les extincteurs niveau 3.",
        auditeurId:  resp1.id,
        siteId:      siteDakar.id,
      },
      {
        reference:   r("AUD", 2),
        titre:       "Audit qualité procédures de maintenance",
        type:        "QUALITE",
        statut:      "TERMINE",
        datePrevue:  new Date("2026-02-10"),
        dateRealisee: new Date("2026-02-12"),
        scoreConformite: 72.0,
        observations: "Plusieurs procédures non à jour. Plan de correction établi.",
        auditeurId:  resp1.id,
        siteId:      siteDakar.id,
      },
      {
        reference:   r("AUD", 3),
        titre:       "Audit environnemental — gestion des déchets",
        type:        "ENVIRONNEMENT",
        statut:      "EN_COURS",
        datePrevue:  new Date("2026-06-01"),
        auditeurId:  resp2.id,
        siteId:      siteThies.id,
      },
      {
        reference:   r("AUD", 4),
        titre:       "Audit hygiène alimentaire — cafétéria",
        type:        "HYGIENE",
        statut:      "PLANIFIE",
        datePrevue:  new Date("2026-07-15"),
        auditeurId:  resp2.id,
        siteId:      siteThies.id,
      },
      {
        reference:   r("AUD", 5),
        titre:       "Audit sécurité terminal maritime",
        type:        "SECURITE",
        statut:      "PLANIFIE",
        datePrevue:  new Date("2026-09-10"),
        auditeurId:  resp1.id,
        siteId:      siteStLouis.id,
      },
    ],
  });
  console.log("Audits créés : 5");

  // ── FORMATIONS ────────────────────────────────────────────────────────────
  await prisma.formation.create({
    data: {
      titre:       "Sécurité incendie et procédures d'évacuation",
      formateur:   "Cabinet SECURITECH Dakar",
      dateDebut:   new Date("2026-01-25"),
      dateFin:     new Date("2026-01-25"),
      dureeHeures: 7,
      statut:      "TERMINEE",
      siteId:      siteDakar.id,
      participations: { create: [{ participantId: emp1.id }, { participantId: emp2.id }, { participantId: emp3.id }] },
    },
  });

  await prisma.formation.create({
    data: {
      titre:       "Travail en hauteur et port du harnais",
      formateur:   "M. Oumar GUEYE — Institut national de sécurité du travail",
      dateDebut:   new Date("2026-02-18"),
      dateFin:     new Date("2026-02-19"),
      dureeHeures: 14,
      statut:      "TERMINEE",
      siteId:      siteDakar.id,
      participations: { create: [{ participantId: emp1.id }, { participantId: emp3.id }] },
    },
  });

  await prisma.formation.create({
    data: {
      titre:       "Gestion des déversements d'hydrocarbures",
      formateur:   "Cabinet ENVISOL — Consultants environnement",
      dateDebut:   new Date("2026-07-08"),
      dureeHeures: 8,
      statut:      "PLANIFIEE",
      siteId:      siteThies.id,
      participations: { create: [{ participantId: emp2.id }, { participantId: resp2.id }] },
    },
  });

  await prisma.formation.create({
    data: {
      titre:       "Premiers secours en milieu industriel (SST)",
      formateur:   "Croix-Rouge sénégalaise",
      dateDebut:   new Date("2026-09-15"),
      dureeHeures: 14,
      statut:      "PLANIFIEE",
      siteId:      siteStLouis.id,
      participations: { create: [{ participantId: emp1.id }, { participantId: emp2.id }, { participantId: emp3.id }, { participantId: resp1.id }] },
    },
  });
  console.log("Formations créées : 4");

  // ── FORMATION EN LIGNE (MINI-LMS) ─────────────────────────────────────────
  await prisma.moduleFormation.create({
    data: {
      titre:        "Risques électriques",
      theme:        "RISQUES_ELECTRIQUES",
      description:  "Module d'auto-formation sur les dangers électriques, les habilitations et les procédures de consignation.",
      scoreMinimum: 80,
      lecons: {
        create: [
          {
            ordre: 1,
            titre: "Les dangers de l'électricité",
            contenu:
              "L'électricité est une énergie invisible et silencieuse : on ne la voit ni ne l'entend avant le contact, ce qui en fait un risque particulièrement insidieux en milieu industriel.\n\n" +
              "Les principaux dangers sont :\n" +
              "- L'électrisation : passage d'un courant électrique à travers le corps humain, provoquant brûlures internes et externes, contractions musculaires incontrôlées, voire arrêt respiratoire.\n" +
              "- L'électrocution : électrisation mortelle, le plus souvent par fibrillation cardiaque.\n" +
              "- L'arc électrique : lors d'un court-circuit, un arc peut atteindre plusieurs milliers de degrés en quelques millisecondes, causant des brûlures graves et des projections de métal en fusion.\n" +
              "- Les incendies d'origine électrique : un défaut d'isolement ou une surcharge peut enflammer les matériaux environnants.\n\n" +
              "La gravité d'un accident électrique dépend de l'intensité du courant, du trajet dans le corps (la traversée du cœur est la plus dangereuse) et de la durée du contact. C'est pourquoi toute intervention sur ou à proximité d'une installation électrique doit être précédée d'une évaluation du risque et réalisée par du personnel habilité.",
          },
          {
            ordre: 2,
            titre: "Habilitations électriques",
            contenu:
              "Toute personne intervenant sur ou à proximité d'installations électriques doit être habilitée par son employeur, après une formation adaptée (référentiel NF C18-510, largement repris dans la réglementation ouest-africaine).\n\n" +
              "Les habilitations se composent d'une lettre et d'un chiffre :\n" +
              "- La lettre indique le domaine de tension : B pour la basse tension, H pour la haute tension.\n" +
              "- Le chiffre indique la nature des opérations : 0 pour un travail d'ordre non électrique, 1 pour une exécution d'opérations électriques, 2 pour l'encadrement de telles opérations.\n" +
              "- Une lettre additionnelle précise le type d'intervention : V pour un travail au voisinage de pièces nues sous tension, R pour une intervention élémentaire, C pour une consignation.\n\n" +
              "Exemples courants :\n" +
              "- B0 : personnel non électricien travaillant à proximité d'installations électriques (sensibilisation aux risques).\n" +
              "- B1V : exécutant électricien pouvant réaliser des travaux au voisinage de pièces sous tension.\n" +
              "- BR : chargé d'intervention générale (dépannage, connexion) en basse tension.\n" +
              "- BC : chargé de consignation, habilité à réaliser les opérations de consignation.\n\n" +
              "L'habilitation n'est pas un diplôme permanent : elle doit être renouvelée périodiquement et peut être suspendue en cas de non-respect des procédures de sécurité.",
          },
          {
            ordre: 3,
            titre: "Consignation et EPI électriques",
            contenu:
              "La consignation électrique est la procédure obligatoire avant toute intervention sur une installation, afin de garantir qu'aucune tension ne peut réapparaître pendant les travaux. Elle comprend 4 étapes, réalisées dans cet ordre strict :\n\n" +
              "1. Séparation : isoler l'ouvrage de toute source de tension (ouverture des sectionneurs).\n" +
              "2. Condamnation : verrouiller les organes de séparation en position d'ouverture (cadenas, pancarte « Ne pas réenclencher »).\n" +
              "3. Identification : vérifier que l'on intervient bien sur l'ouvrage prévu, et non un ouvrage voisin.\n" +
              "4. Vérification d'absence de tension (VAT) : contrôler, à l'aide d'un vérificateur adapté, que l'ouvrage est bien hors tension sur toutes ses phases.\n\n" +
              "Ce n'est qu'après ces 4 étapes que la zone de travail peut être mise à la terre et en court-circuit si nécessaire, puis balisée.\n\n" +
              "En complément de la consignation, des équipements de protection individuelle (EPI) spécifiques sont requis dès qu'un risque électrique subsiste :\n" +
              "- Gants isolants, dont la classe est adaptée à la tension de l'installation.\n" +
              "- Écran facial ou visière anti-UV pour se protéger d'un éventuel arc électrique.\n" +
              "- Vêtements de travail non propagateurs de flamme (anti-arc) pour les interventions à risque élevé.\n" +
              "- Tapis ou tabouret isolant lors de travaux au voisinage de pièces sous tension.\n\n" +
              "Ces équipements ne dispensent jamais du respect des procédures de consignation : ils constituent une protection complémentaire, pas une alternative.",
          },
        ],
      },
      questions: {
        create: [
          {
            ordre: 1,
            enonce: "Que signifie l'habilitation électrique B1V ?",
            reponses: {
              create: [
                { texte: "Exécutant électricien pouvant travailler au voisinage de pièces nues sous tension", estCorrecte: true },
                { texte: "Chargé de travaux non électricien", estCorrecte: false },
                { texte: "Simple sensibilisation, sans habilitation réelle", estCorrecte: false },
                { texte: "Chargé de consignation uniquement", estCorrecte: false },
              ],
            },
          },
          {
            ordre: 2,
            enonce: "Quelle est la première étape de la consignation électrique ?",
            reponses: {
              create: [
                { texte: "La séparation de l'ouvrage de toute source de tension", estCorrecte: true },
                { texte: "La vérification d'absence de tension", estCorrecte: false },
                { texte: "La condamnation en position d'ouverture", estCorrecte: false },
                { texte: "L'identification de l'ouvrage", estCorrecte: false },
              ],
            },
          },
          {
            ordre: 3,
            enonce: "Quel équipement est indispensable pour une intervention en basse tension au voisinage de pièces nues ?",
            reponses: {
              create: [
                { texte: "Des gants isolants adaptés à la classe de tension", estCorrecte: true },
                { texte: "De simples gants de manutention", estCorrecte: false },
                { texte: "Aucun équipement si l'intervention est rapide", estCorrecte: false },
              ],
            },
          },
          {
            ordre: 4,
            enonce: "Que risque-t-on en cas de contact direct avec un conducteur sous tension ?",
            reponses: {
              create: [
                { texte: "Une électrisation pouvant aller jusqu'à l'électrocution (arrêt cardiaque)", estCorrecte: true },
                { texte: "Un simple picotement sans danger", estCorrecte: false },
                { texte: "Aucun risque si l'on porte des gants de travail ordinaires", estCorrecte: false },
                { texte: "Une décharge statique sans conséquence", estCorrecte: false },
              ],
            },
          },
          {
            ordre: 5,
            enonce: "Avant toute intervention sur une installation électrique consignée, que doit-on impérativement vérifier ?",
            reponses: {
              create: [
                { texte: "L'absence de tension à l'aide d'un vérificateur d'absence de tension (VAT)", estCorrecte: true },
                { texte: "La couleur des câbles", estCorrecte: false },
                { texte: "La présence d'un extincteur à proximité", estCorrecte: false },
                { texte: "La météo du jour", estCorrecte: false },
              ],
            },
          },
        ],
      },
    },
  });
  console.log("Module de formation en ligne créé : Risques électriques (3 leçons, 5 questions)");

  // ── HABILITATIONS ─────────────────────────────────────────────────────────
  // Dates calculées par rapport à aujourd'hui (15/06/2026) pour tester /expirantes
  await prisma.habilitation.createMany({
    data: [
      {
        intitule:       "Habilitation électrique B1V",
        type:           "Électrique",
        niveau:         "B1V",
        dateObtention:  new Date("2024-03-15"),
        dateExpiration: new Date("2026-06-20"), // dans 5 jours → BIENTOT_EXPIREE
        statut:         "BIENTOT_EXPIREE",
        titulaireId:    emp1.id,
      },
      {
        intitule:       "CACES Chariot élévateur R489",
        type:           "Conduite d'engin",
        niveau:         "Cat. 3",
        dateObtention:  new Date("2024-06-01"),
        dateExpiration: new Date("2026-07-10"), // dans 25 jours → BIENTOT_EXPIREE
        statut:         "BIENTOT_EXPIREE",
        titulaireId:    emp1.id,
      },
      {
        intitule:       "Habilitation travail en hauteur",
        type:           "Travail en hauteur",
        dateObtention:  new Date("2025-02-18"),
        dateExpiration: new Date("2027-02-18"), // valide
        statut:         "VALIDE",
        titulaireId:    emp2.id,
      },
      {
        intitule:       "ATEX — Atmosphères explosives",
        type:           "Risque chimique",
        dateObtention:  new Date("2023-09-10"),
        dateExpiration: new Date("2026-03-10"), // expiré
        statut:         "EXPIREE",
        titulaireId:    resp1.id,
      },
      {
        intitule:       "CACES Nacelle élévatrice R486",
        type:           "Conduite d'engin",
        niveau:         "Cat. B",
        dateObtention:  new Date("2024-11-05"),
        dateExpiration: new Date("2026-11-05"), // valide
        statut:         "VALIDE",
        titulaireId:    emp3.id,
      },
      {
        intitule:       "Certificat risques chimiques niveau 2",
        type:           "Risque chimique",
        dateObtention:  new Date("2025-05-20"),
        dateExpiration: new Date("2028-05-20"), // valide longtemps
        statut:         "VALIDE",
        titulaireId:    resp2.id,
      },
    ],
  });
  console.log("Habilitations créées : 6 (2 bientôt expirées, 1 expirée, 3 valides)");

  console.log("\n── Seed terminé avec succès ──────────────────────────────");
  console.log("Comptes disponibles :");
  console.log("  ADMIN            → m.diallo@petromer.sn  / Admin123!");
  console.log("  RESPONSABLE_QHSE → f.ndiaye@petromer.sn  / Qhse2026!");
  console.log("  RESPONSABLE_QHSE → i.sow@petromer.sn     / Qhse2026!");
  console.log("  EMPLOYE          → c.fall@petromer.sn    / Employe123!");
  console.log("  EMPLOYE          → a.sarr@petromer.sn    / Employe123!");
  console.log("  EMPLOYE          → m.mbaye@petromer.sn   / Employe123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
