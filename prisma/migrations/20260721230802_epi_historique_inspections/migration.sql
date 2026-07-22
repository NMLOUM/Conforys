/*
  Warnings:

  - You are about to drop the column `date_derniere_inspection` on the `epis` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "epis" DROP COLUMN "date_derniere_inspection",
ADD COLUMN     "frequence_inspection_jours" INTEGER;

-- CreateTable
CREATE TABLE "inspections_epi" (
    "id" TEXT NOT NULL,
    "date_inspection" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conforme" BOOLEAN NOT NULL DEFAULT true,
    "commentaire" TEXT,
    "epi_id" TEXT NOT NULL,
    "inspecteur_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspections_epi_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "inspections_epi" ADD CONSTRAINT "inspections_epi_epi_id_fkey" FOREIGN KEY ("epi_id") REFERENCES "epis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections_epi" ADD CONSTRAINT "inspections_epi_inspecteur_id_fkey" FOREIGN KEY ("inspecteur_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
