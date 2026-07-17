-- AlterTable
ALTER TABLE "actions_correctives" ADD COLUMN     "audit_id" TEXT,
ALTER COLUMN "incident_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "actions_correctives" ADD CONSTRAINT "actions_correctives_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
