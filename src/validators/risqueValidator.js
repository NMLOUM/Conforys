const { z } = require("zod");

const CATEGORIES = [
  "CHUTE", "ELECTRIQUE", "CHIMIQUE", "MECANIQUE", "INCENDIE",
  "BRUIT", "MANUTENTION", "THERMIQUE", "BIOLOGIQUE", "AUTRE",
];

// Schéma de création — danger, site, probabilité et gravité obligatoires
const risqueSchema = z.object({
  danger: z
    .string({ required_error: "Le danger est obligatoire." })
    .min(2, "Le danger doit faire au moins 2 caractères."),
  description: z.string().optional().or(z.literal("")).or(z.null()),
  categorie: z.enum(CATEGORIES, { errorMap: () => ({ message: "Catégorie invalide." }) }).optional(),
  zone: z.string().optional().or(z.literal("")).or(z.null()),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site valide."),
  probabilite: z.coerce
    .number({ invalid_type_error: "La probabilité est obligatoire." })
    .int().min(1, "Doit être entre 1 et 4.").max(4, "Doit être entre 1 et 4."),
  gravite: z.coerce
    .number({ invalid_type_error: "La gravité est obligatoire." })
    .int().min(1, "Doit être entre 1 et 4.").max(4, "Doit être entre 1 et 4."),
  mesuresPrevention: z.string().optional().or(z.literal("")).or(z.null()),
  probabiliteResiduelle: z.coerce.number().int().min(1).max(4).optional().or(z.literal("")).or(z.null()),
  graviteResiduelle:     z.coerce.number().int().min(1).max(4).optional().or(z.literal("")).or(z.null()),
});

// Schéma de modification partielle — tous les champs optionnels
const updateRisqueSchema = risqueSchema.partial();

module.exports = { risqueSchema, updateRisqueSchema };
