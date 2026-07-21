const { z } = require("zod");

// Affectation d'un EPI à un employé — le poste est facultatif
const affecterSchema = z.object({
  employeId: z
    .string({ required_error: "Sélectionnez un employé." })
    .uuid("Identifiant employé invalide."),
  poste: z.string().optional().or(z.literal("")),
});

module.exports = { affecterSchema };
