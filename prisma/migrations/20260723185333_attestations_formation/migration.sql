-- CreateEnum
CREATE TYPE "SourceAttestation" AS ENUM ('SESSION', 'MODULE_EN_LIGNE');

-- AlterTable
ALTER TABLE "formations" ADD COLUMN     "duree_validite_jours" INTEGER;

-- AlterTable
ALTER TABLE "modules_formation" ADD COLUMN     "duree_validite_jours" INTEGER;

-- CreateTable
CREATE TABLE "attestations" (
    "id" TEXT NOT NULL,
    "code_verification" TEXT NOT NULL,
    "titre_formation" TEXT NOT NULL,
    "theme_formation" TEXT,
    "date_obtention" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_expiration" TIMESTAMP(3),
    "score_obtenu" INTEGER,
    "source" "SourceAttestation" NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attestations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attestations_code_verification_key" ON "attestations"("code_verification");

-- AddForeignKey
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
