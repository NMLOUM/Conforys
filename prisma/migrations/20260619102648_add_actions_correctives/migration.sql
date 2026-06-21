-- CreateEnum
CREATE TYPE "PrioriteAction" AS ENUM ('FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "StatutAction" AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINE', 'ANNULE');

-- CreateTable
CREATE TABLE "actions_correctives" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priorite" "PrioriteAction" NOT NULL DEFAULT 'MOYEN',
    "statut" "StatutAction" NOT NULL DEFAULT 'A_FAIRE',
    "date_limite" TIMESTAMP(3),
    "date_cloture" TIMESTAMP(3),
    "commentaire_cloture" TEXT,
    "incident_id" TEXT NOT NULL,
    "responsable_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actions_correctives_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "actions_correctives" ADD CONSTRAINT "actions_correctives_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions_correctives" ADD CONSTRAINT "actions_correctives_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
