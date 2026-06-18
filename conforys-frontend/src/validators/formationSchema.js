import { z } from "zod";

export const formationSchema = z.object({
  titre: z
    .string({ required_error: "Le titre est obligatoire." })
    .min(3, "Minimum 3 caractères."),
  formateur: z
    .string({ required_error: "Le formateur est obligatoire." })
    .min(2, "Minimum 2 caractères."),
  dateDebut: z
    .string({ required_error: "La date de début est obligatoire." })
    .min(1, "La date de début est obligatoire."),
  statut: z.enum(
    ["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"],
    { errorMap: () => ({ message: "Statut invalide." }) }
  ),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site."),
});
