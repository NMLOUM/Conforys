-- CreateEnum
CREATE TYPE "TypeAudit" AS ENUM ('SECURITE', 'QUALITE', 'ENVIRONNEMENT', 'HYGIENE');

-- CreateEnum
CREATE TYPE "StatutAudit" AS ENUM ('PLANIFIE', 'EN_COURS', 'TERMINE', 'ANNULE');

-- CreateTable
CREATE TABLE "audits" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "type" "TypeAudit" NOT NULL,
    "statut" "StatutAudit" NOT NULL DEFAULT 'PLANIFIE',
    "date_prevue" TIMESTAMP(3) NOT NULL,
    "date_realisee" TIMESTAMP(3),
    "score_conformite" DOUBLE PRECISION,
    "observations" TEXT,
    "auditeur_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audits_reference_key" ON "audits"("reference");

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_auditeur_id_fkey" FOREIGN KEY ("auditeur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
