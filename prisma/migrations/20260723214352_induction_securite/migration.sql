-- AlterTable
ALTER TABLE "modules_formation" ADD COLUMN     "est_induction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "obligatoire" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "date_induction" TIMESTAMP(3),
ADD COLUMN     "induction_validee" BOOLEAN NOT NULL DEFAULT false;
