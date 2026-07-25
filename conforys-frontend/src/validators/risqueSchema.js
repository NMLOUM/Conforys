import { z } from "zod";

const CATEGORIES = [
  "CHUTE", "ELECTRIQUE", "CHIMIQUE", "MECANIQUE", "INCENDIE",
  "BRUIT", "MANUTENTION", "THERMIQUE", "BIOLOGIQUE", "AUTRE",
];

export const risqueSchema = z.object({
  danger: z
    .string({ required_error: "Le danger est obligatoire." })
    .min(2, "Minimum 2 caractères."),
  description: z.string().optional().or(z.literal("")),
  categorie: z.enum(CATEGORIES, { errorMap: () => ({ message: "Catégorie invalide." }) }),
  zone: z.string().optional().or(z.literal("")),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site."),
  probabilite: z.coerce.number({ invalid_type_error: "Sélectionnez une probabilité." }).int().min(1).max(4),
  gravite: z.coerce.number({ invalid_type_error: "Sélectionnez une gravité." }).int().min(1).max(4),
  mesuresPrevention: z.string().optional().or(z.literal("")),
  probabiliteResiduelle: z.coerce.number().int().min(1).max(4).optional().or(z.literal("")),
  graviteResiduelle: z.coerce.number().int().min(1).max(4).optional().or(z.literal("")),
});
