const { z } = require("zod");

// Soumission du quiz : une réponse choisie par question
const soumettreQuizSchema = z.object({
  reponses: z
    .array(
      z.object({
        questionId: z.string().uuid("Identifiant de question invalide."),
        reponseId: z.string().uuid("Identifiant de réponse invalide."),
      })
    )
    .min(1, "Au moins une réponse est requise."),
});

module.exports = { soumettreQuizSchema };
