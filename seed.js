require("dotenv").config();
const { PrismaClient } = require("./src/generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Entreprise
  const entreprise = await prisma.entreprise.upsert({
    where: { nom: "CONFORYS DEMO" },
    update: {},
    create: { nom: "CONFORYS DEMO", secteur: "QHSE", pays: "Sénégal" },
  });
  console.log("Entreprise :", entreprise.id, entreprise.nom);

  // Admin
  const hash = await bcrypt.hash("Admin123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@conforys.sn" },
    update: {},
    create: {
      nom: "Admin",
      prenom: "CONFORYS",
      email: "admin@conforys.sn",
      password: hash,
      role: "ADMIN",
      entrepriseId: entreprise.id,
    },
  });
  console.log("Utilisateur :", admin.email, "/ mot de passe : Admin123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
