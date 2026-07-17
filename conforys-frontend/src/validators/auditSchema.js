import { z } from "zod";

export const auditSchema = z.object({
  titre: z
    .string({ required_error: "Le titre est obligatoire." })
    .min(3, "Minimum 3 caractères."),
  templateId: z
    .string({ required_error: "Sélectionnez un template d'audit." })
    .min(1, "Sélectionnez un template d'audit."),
  datePrevue: z
    .string({ required_error: "La date prévue est obligatoire." })
    .min(1, "La date prévue est obligatoire."),
  auditeurId: z
    .string({ required_error: "Auditeur manquant." })
    .uuid("Auditeur invalide."),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site."),
});
