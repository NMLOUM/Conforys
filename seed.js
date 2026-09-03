require("dotenv").config();
const { PrismaClient } = require("./src/generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const r = (prefix, n) => `${prefix}-2026-${String(n).padStart(4, "0")}`;

// ── Dates relatives au moment de l'exécution du seed ────────────────────────
// Évite que les données "en cours"/"à venir" (habilitations bientôt expirées,
// audits planifiés, péremptions EPI...) ne deviennent obsolètes avec le temps :
// le seed peut être rejoué n'importe quand, les indicateurs restent cohérents.
const dansNJours = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const ilYaNJours = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

async function main() {
  console.log("Nettoyage de la base...");
  // Ordre inverse des FK — les tables enfants avec onDelete: Cascade sont
  // nettoyées automatiquement par leur parent (Incident, Audit, Epi, Risque,
  // ActionCorrective) ; seules les tables sans relation cascade nécessitent
  // un deleteMany explicite avant celui de leur table référencée.
  await prisma.habilitation.deleteMany();
  await prisma.attestation.deleteMany();
  await prisma.formation.deleteMany();
  await prisma.risque.deleteMany();       // cascade HistoriqueRisque + ActionCorrective liées
  await prisma.audit.deleteMany();        // cascade QuestionAudit + ActionCorrective liées
  await prisma.epi.deleteMany();          // cascade InspectionEpi + AffectationEpi + HistoriqueEpi
  await prisma.incident.deleteMany();     // cascade HistoriqueIncident + PieceJointe + Commentaire + AnalyseCauses (+ ses enfants) + ActionCorrective liées
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
      dateDerniereRevisionDuerp: ilYaNJours(200), // révision annuelle pas encore en retard
    },
  });
  console.log("Entreprise créée :", entreprise.nom);

  // ── SITES ─────────────────────────────────────────────────────────────────
  const [siteDakar, siteThies, siteStLouis] = await Promise.all([
    prisma.site.create({ data: { nom: "Raffinerie de Mbao",      adresse: "Zone industrielle de Mbao", ville: "Dakar",       entrepriseId: entreprise.id } }),
    prisma.site.create({ data: { nom: "Dépôt de Thiès",          adresse: "Route de Dakar",             ville: "Thiès",       entrepriseId: entreprise.id } }),
    prisma.site.create({ data: { nom: "Terminal de Saint-Louis", adresse: "Quai industriel Nord",        ville: "Saint-Louis", entrepriseId: entreprise.id } }),
  ]);
  console.log("Sites créés : 3");

  // ── UTILISATEURS ──────────────────────────────────────────────────────────
  const h = (pwd) => bcrypt.hash(pwd, 10);

  const [admin, resp1, resp2, resp3, emp1, emp2, emp3] = await Promise.all([
    prisma.user.create({ data: { nom: "DIALLO", prenom: "Mamadou",  email: "m.diallo@petromer.sn", password: await h("Admin123!"),   role: "ADMIN",            entrepriseId: entreprise.id } }),
    prisma.user.create({ data: { nom: "NDIAYE", prenom: "Fatou",    email: "f.ndiaye@petromer.sn",  password: await h("Qhse2026!"),   role: "RESPONSABLE_QHSE", entrepriseId: entreprise.id } }),
    prisma.user.create({ data: { nom: "SOW",    prenom: "Ibrahima", email: "i.sow@petromer.sn",     password: await h("Qhse2026!"),   role: "RESPONSABLE_QHSE", entrepriseId: entreprise.id } }),
    prisma.user.create({ data: { nom: "Loum",   prenom: "Mamadou",  email: "m.loum@dangote.sn",     password: await h("Qhse2026"),    role: "RESPONSABLE_QHSE", entrepriseId: entreprise.id } }),
    prisma.user.create({ data: { nom: "FALL",   prenom: "Cheikh",   email: "c.fall@petromer.sn",    password: await h("Employe123!"), role: "EMPLOYE",          entrepriseId: entreprise.id } }),
    prisma.user.create({ data: { nom: "SARR",   prenom: "Aminata",  email: "a.sarr@petromer.sn",    password: await h("Employe123!"), role: "EMPLOYE",          entrepriseId: entreprise.id } }),
    prisma.user.create({ data: { nom: "MBAYE",  prenom: "Moussa",   email: "m.mbaye@petromer.sn",   password: await h("Employe123!"), role: "EMPLOYE",          entrepriseId: entreprise.id } }),
  ]);
  console.log("Utilisateurs créés : 7");

  // ── INCIDENTS ─────────────────────────────────────────────────────────────
  // Un par statut (BROUILLON/OUVERT/EN_COURS/CLOS/REJETE) et par gravité, pour
  // que les filtres et le tableau de bord montrent une répartition réaliste.
  const inc1 = await prisma.incident.create({
    data: {
      numeroReference: r("INC", 1),
      type: "ACCIDENT",
      description: "Chute d'un opérateur sur sol glissant dû à une fuite d'huile hydraulique provenant d'un flexible endommagé sur la presse n°3. Blessure au genou droit, transport à l'infirmerie du site.",
      gravite: "GRAVE",
      adresseLisible: "Zone de chargement B, Raffinerie de Mbao",
      dateIncident: ilYaNJours(210),
      dateDeclaration: ilYaNJours(210),
      statut: "CLOS",
      dateCloture: ilYaNJours(185),
      declareParId: emp1.id,
      valideParId: resp2.id,
      assigneAId: resp2.id,
      siteId: siteDakar.id,
    },
  });

  const inc2 = await prisma.incident.create({
    data: {
      numeroReference: r("INC", 2),
      type: "ACCIDENT",
      description: "Coupure à la main lors de la manipulation d'une pièce métallique non ébavurée, réceptionnée sans contrôle qualité préalable.",
      gravite: "MOYEN",
      adresseLisible: "Atelier de maintenance, Dépôt de Thiès",
      dateIncident: ilYaNJours(180),
      dateDeclaration: ilYaNJours(180),
      statut: "CLOS",
      dateCloture: ilYaNJours(160),
      declareParId: emp3.id,
      valideParId: resp2.id,
      assigneAId: resp2.id,
      siteId: siteThies.id,
    },
  });

  const inc3 = await prisma.incident.create({
    data: {
      numeroReference: r("INC", 3),
      type: "PRESQU_ACCIDENT",
      description: "Presqu'accident : chute d'un fût de 200 L mal arrimé lors du déchargement d'un camion-citerne. Aucun blessé, le fût est tombé à vide de tout personnel dans la zone.",
      gravite: "MOYEN",
      adresseLisible: "Zone de déchargement, Terminal de Saint-Louis",
      dateIncident: ilYaNJours(10),
      dateDeclaration: ilYaNJours(10),
      statut: "OUVERT",
      declareParId: emp2.id,
      siteId: siteStLouis.id,
    },
  });

  const inc4 = await prisma.incident.create({
    data: {
      numeroReference: r("INC", 4),
      type: "SITUATION_DANGEREUSE",
      description: "Fuite de gaz détectée sur la canalisation principale d'alimentation. Zone évacuée par précaution, intervention de l'équipe HSE en cours.",
      gravite: "CRITIQUE",
      adresseLisible: "Zone de stockage GNL, Raffinerie de Mbao",
      dateIncident: ilYaNJours(25),
      dateDeclaration: ilYaNJours(25),
      statut: "EN_COURS",
      declareParId: resp1.id,
      valideParId: resp2.id,
      assigneAId: resp1.id,
      siteId: siteDakar.id,
    },
  });

  const inc5 = await prisma.incident.create({
    data: {
      numeroReference: r("INC", 5),
      type: "ACCIDENT",
      description: "Contact avec une surface chaude lors d'une opération de maintenance sur un échangeur thermique. Brûlure légère à la main droite.",
      gravite: "FAIBLE",
      adresseLisible: "Salle des machines, Dépôt de Thiès",
      dateIncident: ilYaNJours(150),
      dateDeclaration: ilYaNJours(150),
      statut: "CLOS",
      dateCloture: ilYaNJours(135),
      declareParId: emp3.id,
      valideParId: resp2.id,
      assigneAId: emp3.id,
      siteId: siteThies.id,
    },
  });

  const inc6 = await prisma.incident.create({
    data: {
      numeroReference: r("INC", 6),
      type: "SITUATION_DANGEREUSE",
      description: "Absence de signalisation et de balisage autour d'une tranchée ouverte en zone de circulation piétonne, à proximité du parking visiteurs.",
      gravite: "MOYEN",
      adresseLisible: "Allée centrale, Raffinerie de Mbao",
      dateIncident: ilYaNJours(2),
      dateDeclaration: ilYaNJours(2),
      statut: "BROUILLON",
      declareParId: emp2.id,
      siteId: siteDakar.id,
    },
  });

  const inc7 = await prisma.incident.create({
    data: {
      numeroReference: r("INC", 7),
      type: "INCIDENT_ENVIRONNEMENTAL",
      description: "Déversement mineur d'huile hydraulique lors d'une opération de vidange programmée. Sol contaminé sur environ 2 m², absorbant posé immédiatement.",
      gravite: "MOYEN",
      adresseLisible: "Aire de maintenance, Dépôt de Thiès",
      dateIncident: ilYaNJours(35),
      dateDeclaration: ilYaNJours(35),
      statut: "EN_COURS",
      declareParId: emp3.id,
      valideParId: resp2.id,
      assigneAId: emp3.id,
      siteId: siteThies.id,
    },
  });

  const inc8 = await prisma.incident.create({
    data: {
      numeroReference: r("INC", 8),
      type: "SITUATION_DANGEREUSE",
      description: "Signalement d'une odeur suspecte à proximité du poste de garde principal.",
      gravite: "FAIBLE",
      adresseLisible: "Poste de garde principal, Terminal de Saint-Louis",
      dateIncident: ilYaNJours(45),
      dateDeclaration: ilYaNJours(45),
      statut: "REJETE",
      motifRejet: "Vérification effectuée sur place : l'odeur provenait de travaux de peinture réalisés par une entreprise voisine. Aucun risque industriel identifié.",
      declareParId: emp1.id,
      siteId: siteStLouis.id,
    },
  });
  console.log("Incidents créés : 8 (1 brouillon, 1 ouvert, 2 en cours, 3 clos, 1 rejeté)");

  // ── PISTE D'AUDIT DES INCIDENTS ───────────────────────────────────────────
  await prisma.historiqueIncident.createMany({
    data: [
      { incidentId: inc1.id, auteurId: emp1.id,  action: "Incident déclaré", details: `Référence : ${inc1.numeroReference}`, dateAction: ilYaNJours(210) },
      { incidentId: inc1.id, auteurId: emp1.id,  action: "Statut changé : Brouillon → Ouvert", dateAction: ilYaNJours(210) },
      { incidentId: inc1.id, auteurId: resp2.id, action: "Statut changé : Ouvert → En cours",  dateAction: ilYaNJours(205) },
      { incidentId: inc1.id, auteurId: resp2.id, action: "Statut changé : En cours → Clôturé", dateAction: ilYaNJours(185) },

      { incidentId: inc2.id, auteurId: emp3.id,  action: "Incident déclaré", details: `Référence : ${inc2.numeroReference}`, dateAction: ilYaNJours(180) },
      { incidentId: inc2.id, auteurId: emp3.id,  action: "Statut changé : Brouillon → Ouvert", dateAction: ilYaNJours(180) },
      { incidentId: inc2.id, auteurId: resp2.id, action: "Statut changé : Ouvert → En cours",  dateAction: ilYaNJours(175) },
      { incidentId: inc2.id, auteurId: resp2.id, action: "Statut changé : En cours → Clôturé", dateAction: ilYaNJours(160) },

      { incidentId: inc3.id, auteurId: emp2.id,  action: "Incident déclaré", details: `Référence : ${inc3.numeroReference}`, dateAction: ilYaNJours(10) },
      { incidentId: inc3.id, auteurId: emp2.id,  action: "Statut changé : Brouillon → Ouvert", dateAction: ilYaNJours(10) },

      { incidentId: inc4.id, auteurId: resp1.id, action: "Incident déclaré", details: `Référence : ${inc4.numeroReference}`, dateAction: ilYaNJours(25) },
      { incidentId: inc4.id, auteurId: resp1.id, action: "Statut changé : Brouillon → Ouvert", dateAction: ilYaNJours(25) },
      { incidentId: inc4.id, auteurId: resp2.id, action: "Statut changé : Ouvert → En cours",  dateAction: ilYaNJours(20) },

      { incidentId: inc5.id, auteurId: emp3.id,  action: "Incident déclaré", details: `Référence : ${inc5.numeroReference}`, dateAction: ilYaNJours(150) },
      { incidentId: inc5.id, auteurId: emp3.id,  action: "Statut changé : Brouillon → Ouvert", dateAction: ilYaNJours(150) },
      { incidentId: inc5.id, auteurId: resp2.id, action: "Statut changé : Ouvert → En cours",  dateAction: ilYaNJours(145) },
      { incidentId: inc5.id, auteurId: resp2.id, action: "Statut changé : En cours → Clôturé", dateAction: ilYaNJours(135) },

      { incidentId: inc6.id, auteurId: emp2.id,  action: "Incident déclaré", details: `Référence : ${inc6.numeroReference}`, dateAction: ilYaNJours(2) },

      { incidentId: inc7.id, auteurId: emp3.id,  action: "Incident déclaré", details: `Référence : ${inc7.numeroReference}`, dateAction: ilYaNJours(35) },
      { incidentId: inc7.id, auteurId: emp3.id,  action: "Statut changé : Brouillon → Ouvert", dateAction: ilYaNJours(35) },
      { incidentId: inc7.id, auteurId: resp2.id, action: "Statut changé : Ouvert → En cours",  dateAction: ilYaNJours(30) },

      { incidentId: inc8.id, auteurId: emp1.id,  action: "Incident déclaré", details: `Référence : ${inc8.numeroReference}`, dateAction: ilYaNJours(45) },
      { incidentId: inc8.id, auteurId: emp1.id,  action: "Statut changé : Brouillon → Ouvert", dateAction: ilYaNJours(45) },
      { incidentId: inc8.id, auteurId: resp1.id, action: "Statut changé : Ouvert → Rejeté", details: "Motif : odeur liée à des travaux de peinture voisins.", dateAction: ilYaNJours(40) },
    ],
  });

  // ── ESPACE COLLABORATIF (quelques commentaires réalistes) ────────────────
  await prisma.commentaire.createMany({
    data: [
      { incidentId: inc1.id, auteurId: resp2.id, contenu: "Flexible hydraulique de la presse n°3 identifié comme cause probable. Une analyse des causes va être ouverte.", createdAt: ilYaNJours(207) },
      { incidentId: inc1.id, auteurId: emp1.id,  contenu: "Zone nettoyée et sol séché. Panneau de signalisation temporaire posé en attendant le revêtement antidérapant.", createdAt: ilYaNJours(190) },
      { incidentId: inc4.id, auteurId: resp1.id, contenu: "Équipe technique sur place. Fuite localisée sur un raccord, remplacement en cours. Zone toujours évacuée par précaution.", createdAt: ilYaNJours(24) },
      { incidentId: inc3.id, auteurId: resp2.id, contenu: "Merci de transmettre les photos de l'arrimage avant intervention pour compléter le dossier.", createdAt: ilYaNJours(8) },
    ],
  });
  console.log("Piste d'audit et commentaires des incidents créés.");

  // ── ANALYSE DES CAUSES (incident grave INC1) ─────────────────────────────
  const analyse1 = await prisma.analyseCauses.create({
    data: {
      incidentId: inc1.id,
      auteurId: resp2.id,
      probleme: inc1.description,
      causeRacine: "Absence de procédure de maintenance préventive incluant le contrôle périodique des flexibles hydrauliques.",
      valideLe: ilYaNJours(180),
      actionGenereeLe: ilYaNJours(178),
      etapesPourquoi: {
        create: [
          { ordre: 1, question: "Pourquoi l'opérateur a-t-il chuté ?",                       reponse: "Parce que le sol était glissant à cause d'une fuite d'huile hydraulique." },
          { ordre: 2, question: "Pourquoi y avait-il une fuite d'huile hydraulique ?",        reponse: "Parce qu'un flexible hydraulique était endommagé sur le vérin de la presse n°3." },
          { ordre: 3, question: "Pourquoi le flexible était-il endommagé ?",                  reponse: "Parce qu'il avait dépassé sa durée de vie recommandée sans avoir été remplacé." },
          { ordre: 4, question: "Pourquoi n'a-t-il pas été remplacé à temps ?",               reponse: "Parce que le plan de maintenance préventive ne prévoit pas de contrôle systématique des flexibles hydrauliques." },
          { ordre: 5, question: "Pourquoi le plan de maintenance ne le prévoit-il pas ?",     reponse: "Parce que la procédure de maintenance préventive n'a pas été mise à jour depuis l'installation de l'équipement en 2019." },
        ],
      },
      causesIshikawa: {
        create: [
          { categorie: "MAIN_OEUVRE", libelle: "Formation insuffisante sur la détection précoce des fuites hydrauliques", retenue: false },
          { categorie: "MATERIEL",    libelle: "Flexible hydraulique usagé non remplacé sur la presse n°3",                retenue: true  },
          { categorie: "METHODE",     libelle: "Absence de contrôle périodique des flexibles dans le plan de maintenance", retenue: true  },
          { categorie: "MILIEU",      libelle: "Sol de l'atelier sans revêtement antidérapant",                            retenue: false },
          { categorie: "MATIERE",     libelle: "Huile hydraulique à haute fluidité augmentant le risque de glissade",      retenue: false },
        ],
      },
    },
  });
  console.log("Analyse des causes créée pour", inc1.numeroReference);

  // ── DUERP : RISQUES PROFESSIONNELS ───────────────────────────────────────
  const risque1 = await prisma.risque.create({
    data: {
      danger: "Chute de hauteur lors d'opérations sur la tour de distillation",
      description: "Interventions de maintenance en hauteur sans ligne de vie systématique.",
      categorie: "CHUTE",
      zone: "Tour de distillation",
      probabilite: 2, gravite: 4, niveauRisque: 8,
      mesuresPrevention: "Port du harnais obligatoire, ligne de vie installée, formation travail en hauteur renouvelée annuellement.",
      probabiliteResiduelle: 1, graviteResiduelle: 4, niveauResiduel: 4,
      siteId: siteDakar.id,
      auteurId: resp2.id,
    },
  });

  const risque2 = await prisma.risque.create({
    data: {
      danger: "Exposition à des vapeurs d'hydrocarbures en zone de stockage GNL",
      description: "Ventilation existante insuffisante en cas de fuite prolongée.",
      categorie: "CHIMIQUE",
      zone: "Zone de stockage GNL",
      probabilite: 3, gravite: 4, niveauRisque: 12,
      mesuresPrevention: null,
      siteId: siteDakar.id,
      auteurId: resp1.id,
    },
  });

  const risque3 = await prisma.risque.create({
    data: {
      danger: "Manutention manuelle de charges lourdes (fûts, bidons)",
      description: "Manutention répétée de fûts de 200 L sans aide mécanique systématique.",
      categorie: "MANUTENTION",
      zone: "Aire de maintenance",
      probabilite: 3, gravite: 2, niveauRisque: 6,
      mesuresPrevention: "Formation gestes et postures, mise à disposition de diables de manutention.",
      siteId: siteThies.id,
      auteurId: resp2.id,
    },
  });

  const risque4 = await prisma.risque.create({
    data: {
      danger: "Exposition au bruit à proximité des compresseurs",
      description: "Niveau sonore mesuré au-dessus du seuil réglementaire en continu.",
      categorie: "BRUIT",
      zone: "Salle des compresseurs",
      probabilite: 4, gravite: 2, niveauRisque: 8,
      mesuresPrevention: "Port obligatoire de protections auditives, signalisation de la zone bruyante, rotation des postes.",
      probabiliteResiduelle: 2, graviteResiduelle: 2, niveauResiduel: 4,
      siteId: siteStLouis.id,
      auteurId: resp1.id,
    },
  });
  console.log("Risques DUERP créés : 4 (2 élevés/critiques avec mesures)");

  await prisma.historiqueRisque.createMany({
    data: [
      { risqueId: risque1.id, auteurId: resp2.id, action: "Risque identifié" },
      { risqueId: risque1.id, auteurId: resp2.id, action: "Mesures de prévention mises à jour" },
      { risqueId: risque2.id, auteurId: resp1.id, action: "Risque identifié" },
      { risqueId: risque3.id, auteurId: resp2.id, action: "Risque identifié" },
      { risqueId: risque3.id, auteurId: resp2.id, action: "Mesures de prévention mises à jour" },
      { risqueId: risque4.id, auteurId: resp1.id, action: "Risque identifié" },
      { risqueId: risque4.id, auteurId: resp1.id, action: "Mesures de prévention mises à jour" },
    ],
  });

  // ── AUDITS ────────────────────────────────────────────────────────────────
  const aud1 = await prisma.audit.create({
    data: {
      reference: r("AUD", 1),
      titre: "Audit sécurité incendie de la Raffinerie Q1",
      type: "SECURITE",
      statut: "TERMINE",
      datePrevue: ilYaNJours(212),
      dateRealisee: ilYaNJours(210),
      scoreConformite: 87.5,
      observations: "Bonne conformité générale. Points d'amélioration identifiés sur le contrôle annuel des extincteurs du niveau 3.",
      auditeurId: resp1.id,
      siteId: siteDakar.id,
      questions: {
        create: [
          { ordre: 0, libelle: "Les extincteurs sont-ils correctement signalés et accessibles ?",              criticite: "CRITIQUE", reponse: "CONFORME" },
          { ordre: 1, libelle: "Le plan d'évacuation est-il affiché à chaque étage ?",                          criticite: "MAJEUR",   reponse: "CONFORME" },
          { ordre: 2, libelle: "Les issues de secours sont-elles dégagées en permanence ?",                     criticite: "CRITIQUE", reponse: "CONFORME" },
          { ordre: 3, libelle: "Les extincteurs du niveau 3 sont-ils à jour de leur contrôle annuel ?",         criticite: "MAJEUR",   reponse: "NON_CONFORME", commentaire: "2 extincteurs présentent une date de contrôle dépassée de 3 mois." },
          { ordre: 4, libelle: "Le personnel a-t-il été formé à l'utilisation des extincteurs ?",                criticite: "MINEUR",   reponse: "CONFORME" },
          { ordre: 5, libelle: "Existe-t-il un système de désenfumage fonctionnel ?",                           criticite: "MAJEUR",   reponse: "NON_APPLICABLE" },
        ],
      },
    },
  });

  const aud2 = await prisma.audit.create({
    data: {
      reference: r("AUD", 2),
      titre: "Audit qualité procédures de maintenance",
      type: "QUALITE",
      statut: "TERMINE",
      datePrevue: ilYaNJours(170),
      dateRealisee: ilYaNJours(168),
      scoreConformite: 72.0,
      observations: "Plusieurs procédures non à jour, notamment sur la maintenance des équipements hydrauliques. Plan de correction établi.",
      auditeurId: resp1.id,
      siteId: siteDakar.id,
      questions: {
        create: [
          { ordre: 0, libelle: "Les procédures de maintenance préventive sont-elles à jour ?",                  criticite: "CRITIQUE", reponse: "NON_CONFORME", commentaire: "Plan de maintenance des flexibles hydrauliques non actualisé depuis 2019." },
          { ordre: 1, libelle: "Les fiches d'instruction sont-elles disponibles sur chaque poste ?",            criticite: "MAJEUR",   reponse: "CONFORME" },
          { ordre: 2, libelle: "Les interventions de maintenance sont-elles tracées dans un registre ?",        criticite: "MAJEUR",   reponse: "CONFORME" },
          { ordre: 3, libelle: "Le stock de pièces détachées critiques est-il suffisant ?",                     criticite: "MINEUR",   reponse: "NON_CONFORME", commentaire: "Rupture de stock sur les flexibles hydrauliques de rechange." },
          { ordre: 4, libelle: "Existe-t-il un contrat de maintenance externe pour les équipements spécialisés ?", criticite: "MINEUR", reponse: "NON_APPLICABLE" },
        ],
      },
    },
  });

  const aud3 = await prisma.audit.create({
    data: {
      reference: r("AUD", 3),
      titre: "Audit environnemental de la gestion des déchets",
      type: "ENVIRONNEMENT",
      statut: "EN_COURS",
      datePrevue: ilYaNJours(15),
      auditeurId: resp2.id,
      siteId: siteThies.id,
      questions: {
        create: [
          { ordre: 0, libelle: "Les déchets dangereux sont-ils stockés dans des contenants étanches identifiés ?", criticite: "CRITIQUE", reponse: "CONFORME" },
          { ordre: 1, libelle: "Le tri sélectif est-il respecté sur l'ensemble du site ?",                          criticite: "MAJEUR",   reponse: "NON_CONFORME", commentaire: "Bacs de tri non différenciés dans l'atelier de maintenance." },
          { ordre: 2, libelle: "Les bordereaux de suivi des déchets sont-ils archivés ?",                           criticite: "MAJEUR",   reponse: "NON_REPONDU" },
          { ordre: 3, libelle: "Une filière d'élimination agréée est-elle utilisée pour les huiles usagées ?",      criticite: "CRITIQUE", reponse: "NON_REPONDU" },
        ],
      },
    },
  });

  const aud4 = await prisma.audit.create({
    data: {
      reference: r("AUD", 4),
      titre: "Audit hygiène de la cafétéria et des vestiaires",
      type: "HYGIENE",
      statut: "PLANIFIE",
      datePrevue: dansNJours(30),
      auditeurId: resp2.id,
      siteId: siteThies.id,
      questions: {
        create: [
          { ordre: 0, libelle: "Les surfaces de préparation sont-elles nettoyées selon le planning HACCP ?", criticite: "CRITIQUE" },
          { ordre: 1, libelle: "La chaîne du froid est-elle respectée pour les denrées périssables ?",        criticite: "CRITIQUE" },
          { ordre: 2, libelle: "Les vestiaires disposent-ils de casiers individuels fonctionnels ?",          criticite: "MINEUR" },
        ],
      },
    },
  });

  const aud5 = await prisma.audit.create({
    data: {
      reference: r("AUD", 5),
      titre: "Audit sécurité du terminal maritime",
      type: "SECURITE",
      statut: "PLANIFIE",
      datePrevue: dansNJours(75),
      auditeurId: resp1.id,
      siteId: siteStLouis.id,
      questions: {
        create: [
          { ordre: 0, libelle: "Les procédures d'arrimage des charges sont-elles affichées au poste de déchargement ?", criticite: "MAJEUR" },
          { ordre: 1, libelle: "Les équipements de levage sont-ils vérifiés selon la périodicité réglementaire ?",       criticite: "CRITIQUE" },
          { ordre: 2, libelle: "Le personnel portuaire porte-t-il les EPI requis (gilet, casque, chaussures) ?",         criticite: "CRITIQUE" },
        ],
      },
    },
  });
  console.log("Audits créés : 5 (2 terminés, 1 en cours, 2 planifiés) avec checklist de questions.");

  // ── ACTIONS CORRECTIVES ───────────────────────────────────────────────────
  // a) Générée depuis l'analyse des causes de INC1 — clôturée
  const actionA = await prisma.actionCorrective.create({
    data: {
      description: `Action corrective — cause racine : ${analyse1.causeRacine}`,
      priorite: "ELEVE",
      statut: "TERMINE",
      dateLimite: ilYaNJours(160),
      dateCloture: ilYaNJours(158),
      commentaireCloture: "Plan de maintenance préventive mis à jour : contrôle trimestriel des flexibles hydrauliques intégré à la procédure sur l'ensemble des presses.",
      incidentId: inc1.id,
      responsableId: resp2.id,
      etapes: {
        create: [
          { ordre: 1, libelle: "Recenser tous les flexibles hydrauliques de plus de 5 ans", complete: true },
          { ordre: 2, libelle: "Remplacer les flexibles identifiés comme critiques",          complete: true },
          { ordre: 3, libelle: "Mettre à jour la procédure de maintenance préventive",        complete: true },
        ],
      },
      historique: {
        create: [
          { auteurId: resp2.id, action: "Action créée", details: "Générée depuis l'analyse des causes" },
          { auteurId: resp2.id, action: "Statut changé : A_FAIRE → EN_COURS" },
          { auteurId: resp2.id, action: "Étape complétée : Recenser tous les flexibles hydrauliques de plus de 5 ans" },
          { auteurId: resp2.id, action: "Étape complétée : Remplacer les flexibles identifiés comme critiques" },
          { auteurId: resp2.id, action: "Étape complétée : Mettre à jour la procédure de maintenance préventive" },
          { auteurId: resp2.id, action: "Action clôturée", details: "Plan de maintenance mis à jour." },
        ],
      },
      commentaires: {
        create: [{ auteurId: resp2.id, contenu: "Flexibles remplacés sur les 3 presses concernées de l'atelier. Prochain contrôle trimestriel programmé." }],
      },
    },
  });

  // b) Manuelle, liée à INC1 — à faire
  const actionB = await prisma.actionCorrective.create({
    data: {
      description: "Installer un revêtement antidérapant dans la zone de chargement B",
      priorite: "MOYEN",
      statut: "A_FAIRE",
      dateLimite: dansNJours(20),
      incidentId: inc1.id,
      responsableId: emp1.id,
      etapes: { create: [
        { ordre: 1, libelle: "Obtenir un devis auprès de deux prestataires", complete: false },
        { ordre: 2, libelle: "Planifier l'intervention hors production",     complete: false },
      ] },
      historique: { create: [{ auteurId: resp2.id, action: "Action créée" }] },
    },
  });

  // c) Liée à INC2 — en cours
  const actionC = await prisma.actionCorrective.create({
    data: {
      description: "Mettre en place un contrôle qualité des pièces métalliques à réception (ébavurage systématique)",
      priorite: "MOYEN",
      statut: "EN_COURS",
      dateLimite: dansNJours(10),
      incidentId: inc2.id,
      responsableId: emp3.id,
      etapes: { create: [
        { ordre: 1, libelle: "Définir la fiche de contrôle réception", complete: true },
        { ordre: 2, libelle: "Former les magasiniers au contrôle",      complete: true },
        { ordre: 3, libelle: "Auditer les 3 premières livraisons",      complete: false },
      ] },
      historique: { create: [
        { auteurId: resp2.id, action: "Action créée" },
        { auteurId: emp3.id,  action: "Statut changé : A_FAIRE → EN_COURS" },
        { auteurId: emp3.id,  action: "Étape complétée : Définir la fiche de contrôle réception" },
        { auteurId: emp3.id,  action: "Étape complétée : Former les magasiniers au contrôle" },
      ] },
      commentaires: { create: [{ auteurId: emp3.id, contenu: "Fiche de contrôle validée par le chef d'atelier, formation prévue la semaine prochaine." }] },
    },
  });

  // d) Liée à INC3 — en retard (échéance dépassée, toujours À faire)
  const actionD = await prisma.actionCorrective.create({
    data: {
      description: "Renforcer la procédure d'arrimage des fûts lors du déchargement des camions-citernes",
      priorite: "ELEVE",
      statut: "A_FAIRE",
      dateLimite: ilYaNJours(3),
      incidentId: inc3.id,
      responsableId: emp2.id,
      etapes: { create: [{ ordre: 1, libelle: "Réviser la procédure avec les équipes portuaires", complete: false }] },
      historique: { create: [{ auteurId: resp2.id, action: "Action créée" }] },
    },
  });

  // e) Générée depuis l'audit qualité (AUD2) — clôturée
  const actionE = await prisma.actionCorrective.create({
    data: {
      description: "Mettre à jour les procédures de maintenance non conformes identifiées lors de l'audit qualité",
      priorite: "MOYEN",
      statut: "TERMINE",
      dateLimite: ilYaNJours(60),
      dateCloture: ilYaNJours(55),
      commentaireCloture: "Procédures de maintenance révisées et diffusées à l'ensemble des techniciens.",
      auditId: aud2.id,
      responsableId: resp1.id,
      etapes: { create: [{ ordre: 1, libelle: "Réviser les procédures obsolètes", complete: true }] },
      historique: { create: [
        { auteurId: resp1.id, action: "Action créée", details: "Générée depuis l'audit qualité procédures de maintenance" },
        { auteurId: resp1.id, action: "Action clôturée" },
      ] },
    },
  });

  // f) Générée depuis le risque DUERP critique (stockage GNL) — en cours
  const actionF = await prisma.actionCorrective.create({
    data: {
      description: "Installer un dispositif de ventilation renforcée en zone de stockage GNL",
      priorite: "CRITIQUE",
      statut: "EN_COURS",
      dateLimite: dansNJours(30),
      risqueId: risque2.id,
      responsableId: resp1.id,
      etapes: { create: [
        { ordre: 1, libelle: "Étude technique du dispositif de ventilation", complete: true },
        { ordre: 2, libelle: "Validation budgétaire",                        complete: false },
        { ordre: 3, libelle: "Installation et réception",                    complete: false },
      ] },
      historique: { create: [
        { auteurId: resp1.id, action: "Action créée", details: "Générée depuis le risque DUERP : Exposition à des vapeurs d'hydrocarbures en zone de stockage GNL" },
        { auteurId: resp1.id, action: "Statut changé : A_FAIRE → EN_COURS" },
        { auteurId: resp1.id, action: "Étape complétée : Étude technique du dispositif de ventilation" },
      ] },
    },
  });
  console.log("Actions correctives créées : 6 (2 terminées, 2 en cours, 2 à faire dont 1 en retard)");

  // ── EPI ───────────────────────────────────────────────────────────────────
  // Quantités/seuils choisis pour obtenir une répartition réaliste des 3
  // niveaux d'alerte calculés (OK / Bientôt / Alerte), plus un EPI périmé.
  const epiCasque    = await prisma.epi.create({ data: {
    designation: "Casque de protection classe E", type: "Protection crânienne", reference: "CASQ-E-2024",
    quantite: 8, seuilAlerte: 15, statut: "EN_RUPTURE",
    datePeremption: dansNJours(400), frequenceInspectionJours: 180, siteId: siteDakar.id,
  } });
  const epiGants      = await prisma.epi.create({ data: {
    designation: "Gants anti-coupure niveau 4", type: "Protection des mains", reference: "GANT-NC4",
    quantite: 45, seuilAlerte: 20, statut: "DISPONIBLE", siteId: siteDakar.id,
  } });
  const epiChaussures = await prisma.epi.create({ data: {
    designation: "Chaussures de sécurité S3", type: "Protection des pieds", reference: "CHAUS-S3",
    quantite: 12, seuilAlerte: 10, statut: "DISPONIBLE",
    frequenceInspectionJours: 365, siteId: siteDakar.id,
  } });
  const epiLunettes   = await prisma.epi.create({ data: {
    designation: "Lunettes de protection anti-UV", type: "Protection oculaire", reference: "LUN-UV",
    quantite: 30, seuilAlerte: 10, statut: "DISPONIBLE", siteId: siteThies.id,
  } });
  const epiMasque     = await prisma.epi.create({ data: {
    designation: "Masque anti-gaz FFP3", type: "Protection respiratoire", reference: "MASQ-FFP3",
    quantite: 5, seuilAlerte: 20, statut: "PERIME",
    datePeremption: ilYaNJours(20), frequenceInspectionJours: 30, siteId: siteThies.id,
  } });
  const epiGilet      = await prisma.epi.create({ data: {
    designation: "Gilet haute visibilité classe 3", type: "Vêtement de signalisation", reference: "GIL-HV3",
    quantite: 11, seuilAlerte: 10, statut: "DISPONIBLE", siteId: siteStLouis.id,
  } });
  const epiHarnais    = await prisma.epi.create({ data: {
    designation: "Harnais anti-chute certifié", type: "Protection contre les chutes", reference: "HARN-AC",
    quantite: 3, seuilAlerte: 5, statut: "EN_RUPTURE",
    datePeremption: dansNJours(500), frequenceInspectionJours: 180, siteId: siteStLouis.id,
  } });
  const epiOreilles   = await prisma.epi.create({ data: {
    designation: "Protège-oreilles SNR 33dB", type: "Protection auditive", reference: "PROT-33DB",
    quantite: 60, seuilAlerte: 15, statut: "DISPONIBLE", siteId: siteDakar.id,
  } });
  console.log("EPI créés : 8 (3 en alerte, 2 bientôt, 1 périmé, 3 en stock)");

  await prisma.inspectionEpi.createMany({
    data: [
      { epiId: epiCasque.id,      inspecteurId: resp2.id, dateInspection: ilYaNJours(40), conforme: true },
      { epiId: epiChaussures.id,  inspecteurId: resp1.id, dateInspection: ilYaNJours(60), conforme: true },
      { epiId: epiMasque.id,      inspecteurId: resp2.id, dateInspection: ilYaNJours(50), conforme: false, commentaire: "Cartouche filtrante à remplacer, légère odeur détectée lors du test d'étanchéité." },
      { epiId: epiHarnais.id,     inspecteurId: resp1.id, dateInspection: ilYaNJours(45), conforme: true },
    ],
  });

  await prisma.affectationEpi.createMany({
    data: [
      { epiId: epiHarnais.id, employeId: emp1.id, poste: "Opérateur maintenance",  statut: "ACTIVE", dateAffectation: ilYaNJours(90) },
      { epiId: epiGants.id,   employeId: emp3.id, poste: "Agent de manutention",   statut: "ACTIVE", dateAffectation: ilYaNJours(60) },
      { epiId: epiCasque.id,  employeId: emp2.id, poste: "Superviseur atelier",    statut: "ACTIVE", dateAffectation: ilYaNJours(120) },
      { epiId: epiGilet.id,   employeId: emp1.id, poste: "Agent de manutention",   statut: "RENDUE", dateAffectation: ilYaNJours(240), dateRetour: ilYaNJours(30) },
    ],
  });

  await prisma.historiqueEpi.createMany({
    data: [
      { epiId: epiCasque.id,      auteurId: resp2.id, action: "EPI créé" },
      { epiId: epiCasque.id,      auteurId: resp2.id, action: "Inspection enregistrée", details: "Conforme" },
      { epiId: epiCasque.id,      auteurId: resp2.id, action: "EPI affecté", details: "Aminata SARR" },
      { epiId: epiGants.id,       auteurId: resp2.id, action: "EPI créé" },
      { epiId: epiGants.id,       auteurId: resp2.id, action: "EPI affecté", details: "Moussa MBAYE" },
      { epiId: epiChaussures.id,  auteurId: resp1.id, action: "EPI créé" },
      { epiId: epiChaussures.id,  auteurId: resp1.id, action: "Inspection enregistrée", details: "Conforme" },
      { epiId: epiLunettes.id,    auteurId: resp1.id, action: "EPI créé" },
      { epiId: epiMasque.id,      auteurId: resp2.id, action: "EPI créé" },
      { epiId: epiMasque.id,      auteurId: resp2.id, action: "Inspection enregistrée", details: "Non conforme — cartouche filtrante à remplacer" },
      { epiId: epiGilet.id,       auteurId: resp1.id, action: "EPI créé" },
      { epiId: epiGilet.id,       auteurId: resp1.id, action: "EPI affecté", details: "Cheikh FALL" },
      { epiId: epiGilet.id,       auteurId: resp1.id, action: "EPI restitué", details: "Cheikh FALL" },
      { epiId: epiHarnais.id,     auteurId: resp1.id, action: "EPI créé" },
      { epiId: epiHarnais.id,     auteurId: resp1.id, action: "Inspection enregistrée", details: "Conforme" },
      { epiId: epiHarnais.id,     auteurId: resp1.id, action: "EPI affecté", details: "Cheikh FALL" },
      { epiId: epiOreilles.id,    auteurId: resp2.id, action: "EPI créé" },
    ],
  });

  // ── FORMATIONS ────────────────────────────────────────────────────────────
  await prisma.formation.create({
    data: {
      titre: "Sécurité incendie et procédures d'évacuation",
      formateur: "Cabinet SECURITECH Dakar",
      theme: "INCENDIE",
      dateDebut: ilYaNJours(210), dateFin: ilYaNJours(210),
      dureeHeures: 7, dureeValiditeJours: 180,
      statut: "TERMINEE",
      siteId: siteDakar.id,
      participations: { create: [
        { participantId: emp1.id, present: true, valide: true, dateValidation: ilYaNJours(210) },
        { participantId: emp2.id, present: true, valide: true, dateValidation: ilYaNJours(210) },
        { participantId: emp3.id, present: true, valide: true, dateValidation: ilYaNJours(210) },
      ] },
    },
  });

  await prisma.formation.create({
    data: {
      titre: "Travail en hauteur et port du harnais",
      formateur: "M. Oumar GUEYE — Institut National de Sécurité du Travail",
      theme: "TRAVAIL_HAUTEUR",
      dateDebut: ilYaNJours(150), dateFin: ilYaNJours(149),
      dureeHeures: 14, dureeValiditeJours: 365,
      statut: "TERMINEE",
      siteId: siteDakar.id,
      participations: { create: [
        { participantId: emp1.id, present: true, valide: true, dateValidation: ilYaNJours(149) },
        { participantId: emp3.id, present: true, valide: true, dateValidation: ilYaNJours(149) },
      ] },
    },
  });

  await prisma.formation.create({
    data: {
      titre: "Habilitation électrique B1V / BR",
      formateur: "Institut National de Sécurité du Travail",
      theme: "RISQUES_ELECTRIQUES",
      dateDebut: ilYaNJours(120), dateFin: ilYaNJours(119),
      dureeHeures: 21, dureeValiditeJours: 730,
      statut: "TERMINEE",
      siteId: siteDakar.id,
      participations: { create: [
        { participantId: emp1.id, present: true, valide: true, dateValidation: ilYaNJours(119) },
        { participantId: resp1.id, present: true, valide: true, dateValidation: ilYaNJours(119) },
      ] },
    },
  });

  await prisma.formation.create({
    data: {
      titre: "Premiers secours en milieu industriel (SST)",
      formateur: "Croix-Rouge sénégalaise",
      theme: "PREMIERS_SECOURS",
      dateDebut: ilYaNJours(90), dateFin: ilYaNJours(89),
      dureeHeures: 14,
      statut: "TERMINEE",
      siteId: siteStLouis.id,
      participations: { create: [
        { participantId: emp1.id, present: true, valide: true, dateValidation: ilYaNJours(89) },
        { participantId: emp2.id, present: true, valide: true, dateValidation: ilYaNJours(89) },
        { participantId: emp3.id, present: true, valide: false },
        { participantId: resp1.id, present: true, valide: true, dateValidation: ilYaNJours(89) },
      ] },
    },
  });

  await prisma.formation.create({
    data: {
      titre: "Accueil sécurité des nouveaux arrivants",
      formateur: "Service QHSE interne",
      theme: "ACCUEIL_SECURITE",
      dateDebut: ilYaNJours(30), dateFin: ilYaNJours(30),
      dureeHeures: 3,
      statut: "TERMINEE",
      siteId: siteThies.id,
      participations: { create: [{ participantId: emp3.id, present: true, valide: true, dateValidation: ilYaNJours(30) }] },
    },
  });

  // Induction sécurité d'un intervenant externe avant le début de sa mission
  // — même module que l'accueil des nouveaux employés, mais pas encore
  // réalisée (PLANIFIEE, aucun participant encore marqué présent/validé).
  await prisma.formation.create({
    data: {
      titre: "Induction sécurité pour intervenant sous-traitant",
      formateur: "Service QHSE interne",
      theme: "ACCUEIL_SECURITE",
      dateDebut: dansNJours(5),
      dureeHeures: 2,
      statut: "PLANIFIEE",
      siteId: siteDakar.id,
      participations: { create: [{ participantId: emp2.id }] },
    },
  });

  await prisma.formation.create({
    data: {
      titre: "Gestion des déversements d'hydrocarbures",
      formateur: "Cabinet ENVISOL — Consultants environnement",
      theme: "DECHETS",
      dateDebut: dansNJours(20),
      dureeHeures: 8,
      statut: "PLANIFIEE",
      siteId: siteThies.id,
      participations: { create: [{ participantId: emp3.id }, { participantId: resp2.id }] },
    },
  });

  await prisma.formation.create({
    data: {
      titre: "Gestes et postures : prévention des troubles musculo-squelettiques",
      formateur: "Cabinet ERGONOVA Dakar",
      dateDebut: dansNJours(45),
      dureeHeures: 4,
      statut: "PLANIFIEE",
      siteId: siteDakar.id,
      participations: { create: [{ participantId: emp1.id }, { participantId: emp3.id }] },
    },
  });
  console.log("Formations créées : 8 (5 terminées, 3 planifiées)");

  // ── HABILITATIONS ─────────────────────────────────────────────────────────
  await prisma.habilitation.createMany({
    data: [
      { intitule: "Habilitation électrique B1V", type: "Électrique", niveau: "B1V",
        dateObtention: ilYaNJours(730), dateExpiration: dansNJours(5), statut: "BIENTOT_EXPIREE", titulaireId: emp1.id },
      { intitule: "CACES Chariot élévateur R489", type: "Conduite d'engin", niveau: "Cat. 3",
        dateObtention: ilYaNJours(650), dateExpiration: dansNJours(25), statut: "BIENTOT_EXPIREE", titulaireId: emp1.id },
      { intitule: "Habilitation travail en hauteur", type: "Travail en hauteur",
        dateObtention: ilYaNJours(500), dateExpiration: dansNJours(600), statut: "VALIDE", titulaireId: emp2.id },
      { intitule: "ATEX — Atmosphères explosives", type: "Risque chimique",
        dateObtention: ilYaNJours(900), dateExpiration: ilYaNJours(140), statut: "EXPIREE", titulaireId: resp1.id },
      { intitule: "CACES Nacelle élévatrice R486", type: "Conduite d'engin", niveau: "Cat. B",
        dateObtention: ilYaNJours(420), dateExpiration: dansNJours(460), statut: "VALIDE", titulaireId: emp3.id },
      { intitule: "Certificat risques chimiques niveau 2", type: "Risque chimique",
        dateObtention: ilYaNJours(300), dateExpiration: dansNJours(900), statut: "VALIDE", titulaireId: resp2.id },
    ],
  });
  console.log("Habilitations créées : 6 (2 bientôt expirées, 1 expirée, 3 valides)");

  // ── ATTESTATIONS DE FORMATION ─────────────────────────────────────────────
  await prisma.attestation.createMany({
    data: [
      { codeVerification: crypto.randomBytes(12).toString("hex"), beneficiaireId: emp2.id, titreFormation: "Premiers secours en milieu industriel (SST)", themeFormation: "PREMIERS_SECOURS", dateExpiration: null, source: "SESSION" },
      { codeVerification: crypto.randomBytes(12).toString("hex"), beneficiaireId: emp1.id, titreFormation: "Sécurité incendie et procédures d'évacuation", themeFormation: "INCENDIE", dateExpiration: dansNJours(5), source: "SESSION" },
      { codeVerification: crypto.randomBytes(12).toString("hex"), beneficiaireId: emp3.id, titreFormation: "Travail en hauteur et port du harnais", themeFormation: "TRAVAIL_HAUTEUR", dateExpiration: ilYaNJours(20), source: "SESSION" },
      { codeVerification: crypto.randomBytes(12).toString("hex"), beneficiaireId: emp1.id, titreFormation: "Habilitation électrique B1V / BR", themeFormation: "RISQUES_ELECTRIQUES", dateExpiration: dansNJours(600), source: "SESSION" },
    ],
  });
  console.log("Attestations créées : 4 (1 sans échéance, 1 à recycler bientôt, 1 expirée, 1 valide longtemps)");

  console.log("\n── Seed terminé avec succès ──────────────────────────────");
  console.log("Comptes disponibles :");
  console.log("  ADMIN            → m.diallo@petromer.sn  / Admin123!");
  console.log("  RESPONSABLE_QHSE → f.ndiaye@petromer.sn  / Qhse2026!");
  console.log("  RESPONSABLE_QHSE → i.sow@petromer.sn     / Qhse2026!");
  console.log("  RESPONSABLE_QHSE → m.loum@dangote.sn     / Qhse2026");
  console.log("  EMPLOYE          → c.fall@petromer.sn    / Employe123!");
  console.log("  EMPLOYE          → a.sarr@petromer.sn    / Employe123!");
  console.log("  EMPLOYE          → m.mbaye@petromer.sn   / Employe123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
