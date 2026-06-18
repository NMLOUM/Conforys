const { z } = require("zod");

const auditSchema = z.object({
  titre: z
    .string({ required_error: "Le titre est obligatoire." })
    .min(3, "Le titre doit faire au moins 3 caractères."),
  type: z.enum(
    ["SECURITE", "QUALITE", "ENVIRONNEMENT", "HYGIENE"],
    { errorMap: () => ({ message: "Type d'audit invalide." }) }
  ),
  statut: z.enum(
    ["PLANIFIE", "EN_COURS", "TERMINE", "ANNULE"],
    { errorMap: () => ({ message: "Statut invalide." }) }
  ),
  datePrevue: z
    .string({ required_error: "La date prévue est obligatoire." })
    .min(1, "La date prévue est obligatoire."),
  auditeurId: z
    .string({ required_error: "L'auditeur est obligatoire." })
    .uuid("Identifiant auditeur invalide."),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site valide."),
  dateRealisee:    z.string().optional().or(z.null()),
  scoreConformite: z.coerce.number().min(0).max(100).optional().or(z.null()),
  observations:    z.string().optional(),
});

module.exports = { auditSchema };
