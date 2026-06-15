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
      participants: { connect: [{ id: emp1.id }, { id: emp2.id }, { id: emp3.id }] },
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
      participants: { connect: [{ id: emp1.id }, { id: emp3.id }] },
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
      participants: { connect: [{ id: emp2.id }, { id: resp2.id }] },
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
      participants: { connect: [{ id: emp1.id }, { id: emp2.id }, { id: emp3.id }, { id: resp1.id }] },
    },
  });
  console.log("Formations créées : 4");

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
