import { z } from "zod";

export const epiSchema = z.object({
  designation: z
    .string({ required_error: "La désignation est obligatoire." })
    .min(2, "Minimum 2 caractères."),
  type: z
    .string({ required_error: "Le type est obligatoire." })
    .min(1, "Le type est obligatoire."),
  reference: z.string().optional().or(z.literal("")),
  photoUrl: z.string().optional().or(z.literal("")),
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
  datePeremption: z.string().optional().or(z.literal("")),
  dateDerniereInspection: z.string().optional().or(z.literal("")),
});
