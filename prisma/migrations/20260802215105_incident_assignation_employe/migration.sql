-- AlterEnum
ALTER TYPE "TypeNotification" ADD VALUE 'INCIDENT_ASSIGNE';

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "assigne_a_id" TEXT;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assigne_a_id_fkey" FOREIGN KEY ("assigne_a_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
