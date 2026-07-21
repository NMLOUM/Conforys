-- CreateEnum
CREATE TYPE "StatutAffectation" AS ENUM ('ACTIVE', 'RENDUE');

-- CreateTable
CREATE TABLE "affectations_epi" (
    "id" TEXT NOT NULL,
    "poste" TEXT,
    "date_affectation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_retour" TIMESTAMP(3),
    "statut" "StatutAffectation" NOT NULL DEFAULT 'ACTIVE',
    "epi_id" TEXT NOT NULL,
    "employe_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affectations_epi_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "affectations_epi" ADD CONSTRAINT "affectations_epi_epi_id_fkey" FOREIGN KEY ("epi_id") REFERENCES "epis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_epi" ADD CONSTRAINT "affectations_epi_employe_id_fkey" FOREIGN KEY ("employe_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
