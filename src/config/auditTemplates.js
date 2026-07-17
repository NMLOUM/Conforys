// Bibliothèque des 6 checklists d'audit prédéfinies (constantes, pas de table Prisma dédiée).
// Inspirées d'ISO 45001 et de la réglementation sénégalaise (Code du Travail n°97-17, Décret n°94-244).
// Choisir un template à la création d'un audit génère automatiquement ses QuestionAudit.

const TEMPLATES_AUDIT = [
  {
    id: "securite-chantier",
    nom: "Sécurité chantier",
    description: "Conditions générales de sécurité sur les zones de chantier et de production.",
    type: "SECURITE",
    questions: [
      { libelle: "Le port du casque de sécurité est-il respecté par l'ensemble du personnel ?", criticite: "CRITIQUE" },
      { libelle: "Les zones à risque de chute sont-elles balisées et signalées ?", criticite: "CRITIQUE" },
      { libelle: "Les engins de chantier disposent-ils d'un contrôle technique à jour ?", criticite: "MAJEUR" },
      { libelle: "Les accès au chantier sont-ils sécurisés et contrôlés ?", criticite: "MAJEUR" },
      { libelle: "Le plan de circulation engins/piétons est-il affiché et respecté ?", criticite: "MAJEUR" },
      { libelle: "Les extincteurs sont-ils présents et accessibles sur les zones de travail ?", criticite: "MINEUR" },
      { libelle: "Le registre de sécurité du chantier est-il tenu à jour ?", criticite: "MINEUR" },
    ],
  },
  {
    id: "incendie",
    nom: "Incendie",
    description: "Prévention incendie, moyens d'extinction et procédures d'évacuation.",
    type: "SECURITE",
    questions: [
      { libelle: "Les extincteurs sont-ils vérifiés et la date de contrôle est-elle valide ?", criticite: "CRITIQUE" },
      { libelle: "Les issues de secours sont-elles dégagées en permanence ?", criticite: "CRITIQUE" },
      { libelle: "Le plan d'évacuation est-il affiché dans chaque zone ?", criticite: "MAJEUR" },
      { libelle: "Des exercices d'évacuation incendie sont-ils réalisés périodiquement ?", criticite: "MAJEUR" },
      { libelle: "Les détecteurs de fumée sont-ils fonctionnels ?", criticite: "MAJEUR" },
      { libelle: "Le point de rassemblement est-il clairement identifié ?", criticite: "MINEUR" },
      { libelle: "Les consignes incendie sont-elles affichées et lisibles ?", criticite: "MINEUR" },
    ],
  },
  {
    id: "epi",
    nom: "EPI",
    description: "Disponibilité, état et port des équipements de protection individuelle.",
    type: "SECURITE",
    questions: [
      { libelle: "Chaque poste à risque dispose-t-il des EPI adaptés ?", criticite: "CRITIQUE" },
      { libelle: "Les EPI en stock sont-ils dans leur date de validité ?", criticite: "CRITIQUE" },
      { libelle: "Les employés portent-ils correctement leurs EPI sur le terrain ?", criticite: "MAJEUR" },
      { libelle: "Les EPI endommagés sont-ils retirés du service immédiatement ?", criticite: "MAJEUR" },
      { libelle: "Un registre de distribution des EPI est-il tenu à jour ?", criticite: "MINEUR" },
      { libelle: "Les employés ont-ils reçu une formation sur l'utilisation de leurs EPI ?", criticite: "MINEUR" },
    ],
  },
  {
    id: "environnement",
    nom: "Environnement",
    description: "Gestion des déchets, rejets et produits polluants du site.",
    type: "ENVIRONNEMENT",
    questions: [
      { libelle: "Les déchets dangereux sont-ils stockés séparément des déchets ordinaires ?", criticite: "CRITIQUE" },
      { libelle: "Les rejets liquides respectent-ils les seuils réglementaires (DEEC) ?", criticite: "CRITIQUE" },
      { libelle: "Les fûts et produits chimiques sont-ils correctement étiquetés ?", criticite: "MAJEUR" },
      { libelle: "Un plan de gestion des déchets est-il formalisé et appliqué ?", criticite: "MAJEUR" },
      { libelle: "Les zones de stockage de produits polluants sont-elles étanches ?", criticite: "MINEUR" },
      { libelle: "Le registre des déchets évacués est-il tenu à jour ?", criticite: "MINEUR" },
    ],
  },
  {
    id: "hygiene",
    nom: "Hygiène",
    description: "Salubrité des locaux et protection contre les agents nocifs.",
    type: "HYGIENE",
    questions: [
      { libelle: "L'eau potable est-elle accessible sur le lieu de travail ?", criticite: "CRITIQUE" },
      { libelle: "Les postes exposés à la poussière ou aux vapeurs disposent-ils d'une ventilation adaptée ?", criticite: "CRITIQUE" },
      { libelle: "Les installations sanitaires (toilettes, vestiaires) sont-elles propres et fonctionnelles ?", criticite: "MAJEUR" },
      { libelle: "Les visites médicales périodiques des employés sont-elles à jour ?", criticite: "MAJEUR" },
      { libelle: "Les zones de restauration respectent-elles les normes d'hygiène de base ?", criticite: "MAJEUR" },
      { libelle: "Les produits de nettoyage sont-ils stockés en sécurité ?", criticite: "MINEUR" },
    ],
  },
  {
    id: "electrique",
    nom: "Électrique",
    description: "Conformité des installations électriques et des habilitations du personnel.",
    type: "SECURITE",
    questions: [
      { libelle: "Les armoires électriques sont-elles verrouillées et signalées \"Danger\" ?", criticite: "CRITIQUE" },
      { libelle: "Les habilitations électriques du personnel intervenant sont-elles valides ?", criticite: "CRITIQUE" },
      { libelle: "Les câbles et rallonges électriques sont-ils en bon état, sans dénudage ?", criticite: "MAJEUR" },
      { libelle: "Les disjoncteurs différentiels sont-ils testés périodiquement ?", criticite: "MAJEUR" },
      { libelle: "Les zones humides disposent-elles d'un matériel électrique adapté ?", criticite: "MAJEUR" },
      { libelle: "Le schéma électrique du site est-il disponible et à jour ?", criticite: "MINEUR" },
    ],
  },
];

// Récupère un template par son id (utilisé à la création d'un audit)
const getTemplateById = (id) => TEMPLATES_AUDIT.find((t) => t.id === id) || null;

module.exports = { TEMPLATES_AUDIT, getTemplateById };
