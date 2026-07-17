-- CreateEnum
CREATE TYPE "CriticiteQuestion" AS ENUM ('CRITIQUE', 'MAJEUR', 'MINEUR');

-- CreateEnum
CREATE TYPE "ReponseAudit" AS ENUM ('CONFORME', 'NON_CONFORME', 'NON_APPLICABLE', 'NON_REPONDU');

-- CreateTable
CREATE TABLE "questions_audit" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "criticite" "CriticiteQuestion" NOT NULL DEFAULT 'MAJEUR',
    "reponse" "ReponseAudit" NOT NULL DEFAULT 'NON_REPONDU',
    "commentaire" TEXT,
    "photo_url" TEXT,
    "audit_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_audit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "questions_audit" ADD CONSTRAINT "questions_audit_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
