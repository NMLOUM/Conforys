-- CreateEnum
CREATE TYPE "ThemeFormation" AS ENUM ('INCENDIE', 'EPI', 'RISQUES_ELECTRIQUES', 'DECHETS', 'PREMIERS_SECOURS', 'TRAVAIL_HAUTEUR');

-- AlterTable
ALTER TABLE "formations" ADD COLUMN     "theme" "ThemeFormation";

-- CreateTable
CREATE TABLE "participations_formation" (
    "id" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "valide" BOOLEAN NOT NULL DEFAULT false,
    "date_validation" TIMESTAMP(3),
    "formation_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participations_formation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participations_formation_formation_id_participant_id_key" ON "participations_formation"("formation_id", "participant_id");

-- AddForeignKey
ALTER TABLE "participations_formation" ADD CONSTRAINT "participations_formation_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations_formation" ADD CONSTRAINT "participations_formation_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: preserve existing participants from the old implicit M2M
-- join table "_ParticipantsFormation" (A = formation_id, B = participant_id)
-- into the new explicit table, before dropping it.
INSERT INTO "participations_formation" ("id", "formation_id", "participant_id", "present", "valide", "created_at", "updated_at")
SELECT gen_random_uuid(), "A", "B", false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_ParticipantsFormation";

-- DropForeignKey
ALTER TABLE "_ParticipantsFormation" DROP CONSTRAINT "_ParticipantsFormation_A_fkey";

-- DropForeignKey
ALTER TABLE "_ParticipantsFormation" DROP CONSTRAINT "_ParticipantsFormation_B_fkey";

-- DropTable
DROP TABLE "_ParticipantsFormation";
