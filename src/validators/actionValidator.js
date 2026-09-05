const { z } = require("zod");

// Schéma de CRÉATION d'une action (POST) — description et responsable obligatoires
const actionSchema = z.object({
  description: z
    .string({ required_error: "La description est obligatoire." })
    .min(5, "La description doit faire au moins 5 caractères."),
  priorite: z
    .enum(["FAIBLE", "MOYEN", "ELEVE", "CRITIQUE"], {
      errorMap: () => ({ message: "Priorité invalide." }),
    })
    .optional(),
  dateLimite: z.string().optional().nullable(),
  responsableId: z
    .string({ required_error: "Le responsable est obligatoire." })
    .uuid("Identifiant responsable invalide."),
});

// Schéma de MODIFICATION partielle (PUT /:id) — tous les champs optionnels.
// TERMINE est délibérément exclu : passer au statut TERMINE exige un commentaire
// et doit se faire via la route /cloturer.
const updateActionSchema = z.object({
  description: z
    .string()
    .min(5, "La description doit faire au moins 5 caractères.")
    .optional(),
  priorite: z
    .enum(["FAIBLE", "MOYEN", "ELEVE", "CRITIQUE"], {
      errorMap: () => ({ message: "Priorité invalide." }),
    })
    .optional(),
  statut: z
    .enum(["A_FAIRE", "EN_COURS", "ANNULE"], {
      errorMap: () => ({
        message: "Statut invalide. Pour clôturer une action, utilisez la route /cloturer.",
      }),
    })
    .optional(),
  dateLimite: z.string().optional().nullable(),
  responsableId: z.string().uuid("Identifiant responsable invalide.").optional(),
});

// Schéma de clôture : seul le commentaire est requis
const cloturerActionSchema = z.object({
  commentaireCloture: z
    .string({ required_error: "Le commentaire de clôture est obligatoire." })
    .min(5, "Le commentaire doit faire au moins 5 caractères."),
});

// Filtres de la vue globale (?statut=&priorite=&responsableId=), tous facultatifs
const listeActionsSchema = z.object({
  statut:        z.enum(["A_FAIRE", "EN_COURS", "TERMINE", "ANNULE"]).optional(),
  priorite:      z.enum(["FAIBLE", "MOYEN", "ELEVE", "CRITIQUE"]).optional(),
  responsableId: z.string().uuid("Identifiant responsable invalide.").optional(),
});

// Génération en masse depuis un audit : un seul responsable et une seule
// échéance optionnelle, appliqués à toutes les actions issues des
// non-conformités de ce lot — la description reste dérivée de chaque question
const genererActionsAuditSchema = z.object({
  responsableId: z
    .string({ required_error: "Le responsable est obligatoire." })
    .uuid("Identifiant responsable invalide."),
  dateLimite: z.string().optional().nullable(),
});

module.exports = {
  actionSchema, updateActionSchema, cloturerActionSchema, listeActionsSchema,
  genererActionsAuditSchema,
};
