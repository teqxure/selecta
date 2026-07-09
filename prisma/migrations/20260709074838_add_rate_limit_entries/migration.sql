
-- CreateTable
CREATE TABLE "rate_limit_entries" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "reset_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_entries_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "rate_limit_entries_reset_at_idx" ON "rate_limit_entries"("reset_at");

