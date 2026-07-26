-- AlterTable
ALTER TABLE "entreprises" ADD COLUMN     "date_derniere_revision_duerp" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "historique_risques" (
    "id" TEXT NOT NULL,
    "risque_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "date_action" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_risques_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historique_risques" ADD CONSTRAINT "historique_risques_risque_id_fkey" FOREIGN KEY ("risque_id") REFERENCES "risques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_risques" ADD CONSTRAINT "historique_risques_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
