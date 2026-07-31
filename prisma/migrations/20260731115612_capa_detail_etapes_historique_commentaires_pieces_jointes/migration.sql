-- CreateTable
CREATE TABLE "etapes_action" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "action_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etapes_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_actions" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "action_corrective_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "date_action" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentaires_action" (
    "id" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "action_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentaires_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pieces_jointes_action" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nom" TEXT,
    "type" "TypePieceJointe" NOT NULL DEFAULT 'IMAGE',
    "taille" INTEGER,
    "action_id" TEXT NOT NULL,
    "ajoute_par_id" TEXT,
    "date_ajout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pieces_jointes_action_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "etapes_action" ADD CONSTRAINT "etapes_action_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions_correctives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_actions" ADD CONSTRAINT "historique_actions_action_corrective_id_fkey" FOREIGN KEY ("action_corrective_id") REFERENCES "actions_correctives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_actions" ADD CONSTRAINT "historique_actions_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires_action" ADD CONSTRAINT "commentaires_action_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions_correctives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires_action" ADD CONSTRAINT "commentaires_action_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_jointes_action" ADD CONSTRAINT "pieces_jointes_action_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions_correctives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_jointes_action" ADD CONSTRAINT "pieces_jointes_action_ajoute_par_id_fkey" FOREIGN KEY ("ajoute_par_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
