const { z } = require("zod");

const incidentSchema = z.object({
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
    .string({ required_error: "La date de l'incident est obligatoire." })
    .min(1, "La date de l'incident est obligatoire.")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "La date de l'incident est invalide.",
    }),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site valide."),
  adresseLisible: z.string().optional(),
  latitude:  z.number().optional(),
  longitude: z.number().optional(),
  photoUrl:  z.string().url().optional().or(z.literal("")),
});

module.exports = { incidentSchema };
