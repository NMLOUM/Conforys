-- CreateTable
CREATE TABLE "historique_audits" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "audit_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "date_action" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_formations" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "formation_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "date_action" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_formations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historique_audits" ADD CONSTRAINT "historique_audits_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_audits" ADD CONSTRAINT "historique_audits_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_formations" ADD CONSTRAINT "historique_formations_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_formations" ADD CONSTRAINT "historique_formations_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
