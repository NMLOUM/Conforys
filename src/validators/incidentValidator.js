const { z } = require("zod");

const incidentSchema = z.object({
  type: z.enum(
    ["ACCIDENT", "PRESQU_ACCIDENT", "SITUATION_DANGEREUSE", "INCIDENT_ENVIRONNEMENTAL"],
    { errorMap: () => ({ message: "Type d'incident invalide." }) }
  ),
  gravite: z.enum(
    ["FAIBLE", "MOYEN", "GRAVE", "CRITIQUE"],
    { errorMap: () => ({ message: "Niveau de gravité invalide." }) }
  ),
  description: z
    .string({ required_error: "La description est obligatoire." })
    .min(10, "La description doit faire au moins 10 caractères."),
  dateIncident: z
    .string({ required_error: "La date de l'incident est obligatoire." })
    .min(1, "La date de l'incident est obligatoire.")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "La date de l'incident est invalide.",
    }),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site valide."),
  adresseLisible: z.string().optional(),
  latitude:  z.number().optional(),
  longitude: z.number().optional(),
  photoUrl:  z.string().url().optional().or(z.literal("")),
});

// Modification générique (hors workflow) — volontairement restreint aux champs
// éditables après déclaration. `statut`, `declareParId`, `valideParId`,
// `siteId`, `dateCloture`, `motifRejet`, `numeroReference` sont exclus : ils ne
// doivent changer que via les endpoints de workflow dédiés (soumettre/valider/
// rejeter/clôturer), jamais via un PUT générique (mass assignment).
const updateIncidentSchema = z.object({
  type: z.enum(
    ["ACCIDENT", "PRESQU_ACCIDENT", "SITUATION_DANGEREUSE", "INCIDENT_ENVIRONNEMENTAL"],
    { errorMap: () => ({ message: "Type d'incident invalide." }) }
  ).optional(),
  gravite: z.enum(
    ["FAIBLE", "MOYEN", "GRAVE", "CRITIQUE"],
    { errorMap: () => ({ message: "Niveau de gravité invalide." }) }
  ).optional(),
  description: z
    .string()
    .min(10, "La description doit faire au moins 10 caractères.")
    .optional(),
  dateIncident: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "La date de l'incident est invalide.",
    })
    .optional(),
  adresseLisible: z.string().optional(),
  latitude:  z.number().optional(),
  longitude: z.number().optional(),
  photoUrl:  z.string().url().optional().or(z.literal("")),
});

// Filtres de la liste des incidents (?statut=&type=&gravite=&page=&limit=),
// tous facultatifs — évite qu'une valeur hors-enum remonte telle quelle
// jusqu'à Prisma (ce qui déclenchait un 500 générique au lieu d'un 400 propre).
const listeIncidentsSchema = z.object({
  statut:  z.enum(["BROUILLON", "OUVERT", "EN_COURS", "CLOS", "REJETE"]).optional(),
  type:    z.enum(["ACCIDENT", "PRESQU_ACCIDENT", "SITUATION_DANGEREUSE", "INCIDENT_ENVIRONNEMENTAL"]).optional(),
  gravite: z.enum(["FAIBLE", "MOYEN", "GRAVE", "CRITIQUE"]).optional(),
  page:    z.coerce.number().int().positive().optional(),
  // Plafonné à 1000 (et non 100) : les cartes KPI et l'export CSV de cette
  // page font volontairement des requêtes à forte limite pour agréger tous
  // les incidents correspondants, pas seulement une page d'affichage.
  limit:   z.coerce.number().int().positive().max(1000).optional(),
});

// Rejet d'un incident — motif obligatoire (la règle de longueur minimale était
// jusqu'ici codée en dur dans le service, hors de la couche de validation Zod attendue)
const rejeterIncidentSchema = z.object({
  motifRejet: z
    .string({ required_error: "Le motif de rejet est obligatoire." })
    .min(5, "Le motif de rejet est obligatoire (min. 5 caractères)."),
});

module.exports = { incidentSchema, updateIncidentSchema, listeIncidentsSchema, rejeterIncidentSchema };
