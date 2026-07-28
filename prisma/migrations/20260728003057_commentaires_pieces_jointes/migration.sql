-- AlterTable
ALTER TABLE "pieces_jointes" ADD COLUMN     "ajoute_par_id" TEXT,
ADD COLUMN     "taille" INTEGER;

-- CreateTable
CREATE TABLE "commentaires" (
    "id" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentaires_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pieces_jointes" ADD CONSTRAINT "pieces_jointes_ajoute_par_id_fkey" FOREIGN KEY ("ajoute_par_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
