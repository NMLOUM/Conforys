import { z } from "zod";

export const incidentSchema = z.object({
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
    .string({ required_error: "La date est obligatoire." })
    .min(1, "La date est obligatoire."),
  declareParId: z
    .string({ required_error: "Déclarant manquant." })
    .uuid("Déclarant invalide."),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site."),
  adresseLisible: z.string().optional(),
});
