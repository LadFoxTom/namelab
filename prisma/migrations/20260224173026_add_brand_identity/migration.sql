-- CreateEnum
CREATE TYPE "BrandStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "PurchaseTier" AS ENUM ('LOGO_ONLY', 'BRAND_KIT', 'BRAND_KIT_PRO');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "BrandSession" (
    "id" TEXT NOT NULL,
    "domainName" TEXT NOT NULL,
    "tld" TEXT NOT NULL,
    "searchQuery" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "signals" JSONB NOT NULL,
    "status" "BrandStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandConcept" (
    "id" TEXT NOT NULL,
    "brandSessionId" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "generationIndex" INTEGER NOT NULL,
    "promptUsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandPurchase" (
    "id" TEXT NOT NULL,
    "brandSessionId" TEXT NOT NULL,
    "tier" "PurchaseTier" NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "downloadUrl" TEXT,
    "downloadExpiresAt" TIMESTAMP(3),
    "zipR2Key" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandSession_domainName_idx" ON "BrandSession"("domainName");

-- CreateIndex
CREATE INDEX "BrandSession_anonymousId_idx" ON "BrandSession"("anonymousId");

-- CreateIndex
CREATE INDEX "BrandConcept_brandSessionId_idx" ON "BrandConcept"("brandSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandPurchase_stripePaymentIntentId_key" ON "BrandPurchase"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "BrandPurchase_stripePaymentIntentId_idx" ON "BrandPurchase"("stripePaymentIntentId");

-- AddForeignKey
ALTER TABLE "BrandConcept" ADD CONSTRAINT "BrandConcept_brandSessionId_fkey" FOREIGN KEY ("brandSessionId") REFERENCES "BrandSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPurchase" ADD CONSTRAINT "BrandPurchase_brandSessionId_fkey" FOREIGN KEY ("brandSessionId") REFERENCES "BrandSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
