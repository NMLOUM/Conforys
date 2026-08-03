-- CreateTable
CREATE TABLE "historique_epis" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "epi_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "date_action" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_epis_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historique_epis" ADD CONSTRAINT "historique_epis_epi_id_fkey" FOREIGN KEY ("epi_id") REFERENCES "epis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_epis" ADD CONSTRAINT "historique_epis_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
