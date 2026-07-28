-- AlterTable
ALTER TABLE "ai_feature_usages" ADD COLUMN     "completion_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "total_tokens" INTEGER NOT NULL DEFAULT 0;

