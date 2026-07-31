-- AlterTable
ALTER TABLE "affectations_epi" ADD COLUMN     "date_signature" TIMESTAMP(3),
ADD COLUMN     "signe" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "departement" TEXT,
ADD COLUMN     "poste" TEXT,
ADD COLUMN     "site_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
