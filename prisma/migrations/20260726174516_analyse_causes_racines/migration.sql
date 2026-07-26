-- CreateEnum
CREATE TYPE "Categorie5M" AS ENUM ('MAIN_OEUVRE', 'MATERIEL', 'METHODE', 'MILIEU', 'MATIERE');

-- CreateTable
CREATE TABLE "analyses_causes" (
    "id" TEXT NOT NULL,
    "probleme" TEXT NOT NULL,
    "cause_racine" TEXT,
    "valide_le" TIMESTAMP(3),
    "incident_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_causes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "causes_ishikawa" (
    "id" TEXT NOT NULL,
    "categorie" "Categorie5M" NOT NULL,
    "libelle" TEXT NOT NULL,
    "retenue" BOOLEAN NOT NULL DEFAULT false,
    "analyse_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "causes_ishikawa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapes_pourquoi" (
    "id" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "reponse" TEXT NOT NULL,
    "analyse_id" TEXT NOT NULL,

    CONSTRAINT "etapes_pourquoi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analyses_causes_incident_id_key" ON "analyses_causes"("incident_id");

-- AddForeignKey
ALTER TABLE "analyses_causes" ADD CONSTRAINT "analyses_causes_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses_causes" ADD CONSTRAINT "analyses_causes_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "causes_ishikawa" ADD CONSTRAINT "causes_ishikawa_analyse_id_fkey" FOREIGN KEY ("analyse_id") REFERENCES "analyses_causes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapes_pourquoi" ADD CONSTRAINT "etapes_pourquoi_analyse_id_fkey" FOREIGN KEY ("analyse_id") REFERENCES "analyses_causes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
