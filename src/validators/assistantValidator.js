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

module.exports = { chatSchema };
