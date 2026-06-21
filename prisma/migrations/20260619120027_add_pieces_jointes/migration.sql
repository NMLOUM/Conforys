-- CreateEnum
CREATE TYPE "TypePieceJointe" AS ENUM ('IMAGE', 'DOCUMENT');

-- CreateTable
CREATE TABLE "pieces_jointes" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nom" TEXT,
    "type" "TypePieceJointe" NOT NULL DEFAULT 'IMAGE',
    "incident_id" TEXT NOT NULL,
    "date_ajout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pieces_jointes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pieces_jointes" ADD CONSTRAINT "pieces_jointes_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
