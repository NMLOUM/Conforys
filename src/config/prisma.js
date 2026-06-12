// Importation du client Prisma généré (l'outil qui parle à la base)
const { PrismaClient } = require("../generated/prisma");
// Importation de l'adapter PostgreSQL spécifique à Prisma 7
const { PrismaPg } = require("@prisma/adapter-pg");

// Création de l'adapter avec l'adresse de la base (lue depuis le .env)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
// Création de l'instance unique du client Prisma (porte d'entrée vers la base)
const prisma = new PrismaClient({ adapter });

// Export de l'instance pour la réutiliser dans toute l'application
module.exports = prisma;