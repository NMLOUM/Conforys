-- CreateEnum
CREATE TYPE "StatutFormation" AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StatutHabilitation" AS ENUM ('VALIDE', 'EXPIREE', 'BIENTOT_EXPIREE');

-- CreateTable
CREATE TABLE "formations" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "formateur" TEXT NOT NULL,
    "statut" "StatutFormation" NOT NULL DEFAULT 'PLANIFIEE',
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3),
    "duree_heures" DOUBLE PRECISION,
    "site_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habilitations" (
    "id" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "niveau" TEXT,
    "date_obtention" TIMESTAMP(3) NOT NULL,
    "date_expiration" TIMESTAMP(3) NOT NULL,
    "statut" "StatutHabilitation" NOT NULL DEFAULT 'VALIDE',
    "titulaire_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habilitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ParticipantsFormation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ParticipantsFormation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ParticipantsFormation_B_index" ON "_ParticipantsFormation"("B");

-- AddForeignKey
ALTER TABLE "formations" ADD CONSTRAINT "formations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habilitations" ADD CONSTRAINT "habilitations_titulaire_id_fkey" FOREIGN KEY ("titulaire_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ParticipantsFormation" ADD CONSTRAINT "_ParticipantsFormation_A_fkey" FOREIGN KEY ("A") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ParticipantsFormation" ADD CONSTRAINT "_ParticipantsFormation_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
