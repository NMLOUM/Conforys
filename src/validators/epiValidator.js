const { z } = require("zod");

const epiSchema = z.object({
  designation: z
    .string({ required_error: "La désignation est obligatoire." })
    .min(2, "La désignation doit faire au moins 2 caractères."),
  type: z
    .string({ required_error: "Le type est obligatoire." })
    .min(1, "Le type est obligatoire."),
  reference:   z.string().optional(),
  photoUrl:    z.string().url("URL de photo invalide.").optional().or(z.literal("")).or(z.null()),
  quantite: z.coerce
    .number({ invalid_type_error: "La quantité doit être un nombre." })
    .int("La quantité doit être un entier.")
    .min(0, "La quantité ne peut pas être négative."),
  seuilAlerte: z.coerce
    .number({ invalid_type_error: "Le seuil doit être un nombre." })
    .int("Le seuil doit être un entier.")
    .min(0, "Le seuil ne peut pas être négatif."),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site valide."),
  statut: z
    .enum(["DISPONIBLE", "EN_RUPTURE", "PERIME", "COMMANDE"])
    .optional(),
  datePeremption: z.string().optional().or(z.null()),
  frequenceInspectionJours: z.coerce
    .number({ invalid_type_error: "La fréquence doit être un nombre." })
    .int("La fréquence doit être un entier.")
    .min(1, "La fréquence doit être d'au moins 1 jour.")
    .optional()
    .or(z.literal(""))
    .or(z.null()),
});

module.exports = { epiSchema };
