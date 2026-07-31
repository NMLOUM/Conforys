-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_site_id_fkey";

-- AlterTable
ALTER TABLE "affectations_epi" DROP COLUMN "date_signature",
DROP COLUMN "signe";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "departement",
DROP COLUMN "poste",
DROP COLUMN "site_id";
