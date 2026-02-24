-- CreateTable
CREATE TABLE "SavedDomain" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "namingStrategy" TEXT NOT NULL,
    "brandabilityScore" INTEGER NOT NULL,
    "memorabilityScore" INTEGER NOT NULL,
    "seoScore" INTEGER NOT NULL,
    "lqsScore" INTEGER,
    "providers" JSONB NOT NULL,
    "cheapestProvider" JSONB,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedDomain_userId_idx" ON "SavedDomain"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedDomain_userId_domain_key" ON "SavedDomain"("userId", "domain");

-- AddForeignKey
ALTER TABLE "SavedDomain" ADD CONSTRAINT "SavedDomain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
