const { z } = require("zod");

// Question posée à l'assistant IA — non vide, plafonnée pour éviter l'abus
// (prompts démesurés qui gonflent inutilement le coût de l'appel Anthropic).
const chatSchema = z.object({
  question: z
    .string({ required_error: "La question est obligatoire." })
    .trim()
    .min(1, "La question ne peut pas être vide.")
    .max(2000, "La question est trop longue (2000 caractères maximum)."),
});

const suggestionRisqueSchema = z.object({
  danger: z.string().trim().min(1).max(500),
  categorie: z.string().trim().max(100).optional(),
  zone: z.string().trim().max(300).nullable().optional(),
  probabilite: z.coerce.number().int().min(1).max(4),
  gravite: z.coerce.number().int().min(1).max(4),
  mesuresPrevention: z.string().max(3000).nullable().optional(),
});

const suggestionContexteSchema = z.object({
  type: z.enum(["INCIDENT", "ACTION"]),
  contexte: z.string().trim().min(5).max(3000),
  contenuExistant: z.string().max(3000).optional().default(""),
});

module.exports = { chatSchema, suggestionRisqueSchema, suggestionContexteSchema };
