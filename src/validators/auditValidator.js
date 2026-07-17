const { z } = require("zod");

// Création d'un audit à partir d'un template — le type et les questions
// sont dérivés du template côté service, pas saisis manuellement.
const auditSchema = z.object({
  titre: z
    .string({ required_error: "Le titre est obligatoire." })
    .min(3, "Le titre doit faire au moins 3 caractères."),
  templateId: z
    .string({ required_error: "Sélectionnez un template d'audit." })
    .min(1, "Sélectionnez un template d'audit."),
  datePrevue: z
    .string({ required_error: "La date prévue est obligatoire." })
    .min(1, "La date prévue est obligatoire."),
  auditeurId: z
    .string({ required_error: "L'auditeur est obligatoire." })
    .uuid("Identifiant auditeur invalide."),
  siteId: z
    .string({ required_error: "Sélectionnez un site." })
    .uuid("Sélectionnez un site valide."),
});

// Modification partielle (PUT /:id) — volontairement restreint aux champs
// descriptifs. Le statut, la date de réalisation et le score ne peuvent être
// modifiés que via les routes de transition dédiées (/demarrer, /finaliser,
// /annuler) : sans cette restriction, ce PUT générique permettrait de
// contourner les règles du workflow (ex: passer directement à TERMINE sans
// vérifier que toutes les questions sont répondues).
const updateAuditSchema = z.object({
  titre: z
    .string()
    .min(3, "Le titre doit faire au moins 3 caractères.")
    .optional(),
  datePrevue: z.string().optional(),
  siteId: z.string().uuid("Sélectionnez un site valide.").optional(),
  observations: z.string().optional(),
});

// Réponse à une question de checklist — commentaire obligatoire si NON_CONFORME
const repondreQuestionSchema = z
  .object({
    reponse: z.enum(
      ["CONFORME", "NON_CONFORME", "NON_APPLICABLE", "NON_REPONDU"],
      { errorMap: () => ({ message: "Réponse invalide." }) }
    ),
    commentaire: z.string().optional().or(z.literal("")),
    photoUrl: z.string().url().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.reponse === "NON_CONFORME" && (!data.commentaire || data.commentaire.trim().length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["commentaire"],
        message: "Un commentaire est obligatoire pour une non-conformité (min. 5 caractères).",
      });
    }
  });

module.exports = { auditSchema, updateAuditSchema, repondreQuestionSchema };