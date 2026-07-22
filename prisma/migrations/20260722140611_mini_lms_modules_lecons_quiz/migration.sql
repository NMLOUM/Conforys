-- CreateTable
CREATE TABLE "modules_formation" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "theme" "ThemeFormation",
    "description" TEXT,
    "score_minimum" INTEGER NOT NULL DEFAULT 80,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecons" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "module_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lecons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions_quiz" (
    "id" TEXT NOT NULL,
    "enonce" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "module_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reponses_quiz" (
    "id" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "est_correcte" BOOLEAN NOT NULL DEFAULT false,
    "question_id" TEXT NOT NULL,

    CONSTRAINT "reponses_quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progressions_module" (
    "id" TEXT NOT NULL,
    "lecons_completees" INTEGER NOT NULL DEFAULT 0,
    "score_quiz" INTEGER,
    "valide" BOOLEAN NOT NULL DEFAULT false,
    "date_validation" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progressions_module_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "progressions_module_user_id_module_id_key" ON "progressions_module"("user_id", "module_id");

-- AddForeignKey
ALTER TABLE "lecons" ADD CONSTRAINT "lecons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules_formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions_quiz" ADD CONSTRAINT "questions_quiz_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules_formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponses_quiz" ADD CONSTRAINT "reponses_quiz_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions_quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progressions_module" ADD CONSTRAINT "progressions_module_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progressions_module" ADD CONSTRAINT "progressions_module_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules_formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
