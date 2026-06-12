-- CreateEnum
CREATE TYPE "StatutEpi" AS ENUM ('DISPONIBLE', 'EN_RUPTURE', 'PERIME', 'COMMANDE');

-- CreateTable
CREATE TABLE "epis" (
    "id" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "seuilAlerte" INTEGER NOT NULL DEFAULT 5,
    "statut" "StatutEpi" NOT NULL DEFAULT 'DISPONIBLE',
    "date_peremption" TIMESTAMP(3),
    "site_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "epis_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "epis" ADD CONSTRAINT "epis_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
