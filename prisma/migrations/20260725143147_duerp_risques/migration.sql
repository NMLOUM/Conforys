-- CreateEnum
CREATE TYPE "CategorieRisque" AS ENUM ('CHUTE', 'ELECTRIQUE', 'CHIMIQUE', 'MECANIQUE', 'INCENDIE', 'BRUIT', 'MANUTENTION', 'THERMIQUE', 'BIOLOGIQUE', 'AUTRE');

-- AlterTable
ALTER TABLE "actions_correctives" ADD COLUMN     "risque_id" TEXT;

-- CreateTable
CREATE TABLE "risques" (
    "id" TEXT NOT NULL,
    "danger" TEXT NOT NULL,
    "description" TEXT,
    "categorie" "CategorieRisque" NOT NULL DEFAULT 'AUTRE',
    "zone" TEXT,
    "probabilite" INTEGER NOT NULL,
    "gravite" INTEGER NOT NULL,
    "niveau_risque" INTEGER NOT NULL,
    "mesures_prevention" TEXT,
    "probabilite_residuelle" INTEGER,
    "gravite_residuelle" INTEGER,
    "niveau_residuel" INTEGER,
    "site_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risques_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "actions_correctives" ADD CONSTRAINT "actions_correctives_risque_id_fkey" FOREIGN KEY ("risque_id") REFERENCES "risques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risques" ADD CONSTRAINT "risques_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risques" ADD CONSTRAINT "risques_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
