-- CreateTable
CREATE TABLE "historique_assistant" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "reponse" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilisateur_id" TEXT NOT NULL,
    "entreprise_id" TEXT NOT NULL,

    CONSTRAINT "historique_assistant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historique_assistant_utilisateur_id_created_at_idx" ON "historique_assistant"("utilisateur_id", "created_at");

-- CreateIndex
CREATE INDEX "historique_assistant_entreprise_id_created_at_idx" ON "historique_assistant"("entreprise_id", "created_at");

-- AddForeignKey
ALTER TABLE "historique_assistant" ADD CONSTRAINT "historique_assistant_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_assistant" ADD CONSTRAINT "historique_assistant_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "entreprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
