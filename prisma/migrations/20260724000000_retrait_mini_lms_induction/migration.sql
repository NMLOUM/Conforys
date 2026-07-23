-- DropForeignKey
ALTER TABLE "lecons" DROP CONSTRAINT "lecons_module_id_fkey";

-- DropForeignKey
ALTER TABLE "progressions_module" DROP CONSTRAINT "progressions_module_module_id_fkey";

-- DropForeignKey
ALTER TABLE "progressions_module" DROP CONSTRAINT "progressions_module_user_id_fkey";

-- DropForeignKey
ALTER TABLE "questions_quiz" DROP CONSTRAINT "questions_quiz_module_id_fkey";

-- DropForeignKey
ALTER TABLE "reponses_quiz" DROP CONSTRAINT "reponses_quiz_question_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "date_induction",
DROP COLUMN "induction_validee";

-- DropTable
DROP TABLE "lecons";

-- DropTable
DROP TABLE "modules_formation";

-- DropTable
DROP TABLE "progressions_module";

-- DropTable
DROP TABLE "questions_quiz";

-- DropTable
DROP TABLE "reponses_quiz";

