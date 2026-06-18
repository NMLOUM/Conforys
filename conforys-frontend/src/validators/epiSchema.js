import { z } from "zod";

export const epiSchema = z.object({
  designation: z
    .string({ required_error: "La désignation est obligatoire." })
    .min(2, "Minimum 2 caractères."),
  type: z
    .string({ required_error: "Le type est obligatoire." })
    .min(1, "Le type est obligatoire."),
  quantite: z.coerce
    .number({ invalid_type_error: "Entrez un nombre." })
    .int("Entier requis.")
    .min(0, "Ne peut pas être négatif."),
  seuilAlerte: z.coerce
    .number({ invalid_type_error: "Entrez un nombre." })
    .int("Entier requis.")
    .min(0, "Ne peut pas être négatif."),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site."),
});
