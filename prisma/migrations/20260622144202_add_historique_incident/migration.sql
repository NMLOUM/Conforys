-- CreateTable
CREATE TABLE "historique_incidents" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "incident_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "date_action" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_incidents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historique_incidents" ADD CONSTRAINT "historique_incidents_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_incidents" ADD CONSTRAINT "historique_incidents_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
