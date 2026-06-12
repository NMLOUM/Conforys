-- CreateEnum
CREATE TYPE "TypeIncident" AS ENUM ('ACCIDENT', 'PRESQU_ACCIDENT', 'SITUATION_DANGEREUSE', 'INCIDENT_ENVIRONNEMENTAL');

-- CreateEnum
CREATE TYPE "StatutIncident" AS ENUM ('BROUILLON', 'OUVERT', 'EN_COURS', 'CLOS', 'REJETE');

-- CreateEnum
CREATE TYPE "GraviteIncident" AS ENUM ('FAIBLE', 'MOYEN', 'GRAVE', 'CRITIQUE');

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "ville" TEXT,
    "entrepriseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "numero_reference" TEXT NOT NULL,
    "type" "TypeIncident" NOT NULL,
    "description" TEXT NOT NULL,
    "statut" "StatutIncident" NOT NULL DEFAULT 'BROUILLON',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "adresse_lisible" TEXT,
    "photo_url" TEXT,
    "gravite" "GraviteIncident" NOT NULL DEFAULT 'FAIBLE',
    "date_incident" TIMESTAMP(3) NOT NULL,
    "date_declaration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_cloture" TIMESTAMP(3),
    "declare_par_id" TEXT NOT NULL,
    "valide_par_id" TEXT,
    "site_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "incidents_numero_reference_key" ON "incidents"("numero_reference");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "entreprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_declare_par_id_fkey" FOREIGN KEY ("declare_par_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_valide_par_id_fkey" FOREIGN KEY ("valide_par_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
