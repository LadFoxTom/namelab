-- AlterTable
ALTER TABLE "BrandConcept" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "evaluationFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "passedEvaluation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;
