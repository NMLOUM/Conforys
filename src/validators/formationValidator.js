const { z } = require("zod");

const formationSchema = z.object({
  titre: z
    .string({ required_error: "Le titre est obligatoire." })
    .min(3, "Le titre doit faire au moins 3 caractères."),
  formateur: z
    .string({ required_error: "Le formateur est obligatoire." })
    .min(2, "Le nom du formateur doit faire au moins 2 caractères."),
  dateDebut: z
    .string({ required_error: "La date de début est obligatoire." })
    .min(1, "La date de début est obligatoire."),
  statut: z.enum(
    ["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"],
    { errorMap: () => ({ message: "Statut invalide." }) }
  ).optional(),
  theme: z.enum(
    ["INCENDIE", "EPI", "RISQUES_ELECTRIQUES", "DECHETS", "PREMIERS_SECOURS", "TRAVAIL_HAUTEUR", "ACCUEIL_SECURITE"],
    { errorMap: () => ({ message: "Thème invalide." }) }
  ).optional().or(z.null()),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site valide."),
  description:    z.string().optional(),
  dateFin:        z.string().optional().or(z.null()),
  dureeHeures:    z.coerce.number().positive().optional().or(z.null()),
  participantIds: z.array(z.string().uuid()).optional(),
});

// Marquer la présence d'un participant
const presenceSchema = z.object({
  present: z.boolean({ required_error: "Le champ present est obligatoire." }),
});

module.exports = { formationSchema, presenceSchema };
