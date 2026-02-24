-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "businessIdea" TEXT NOT NULL,
    "industry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainSuggestion" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL,
    "reasoning" TEXT NOT NULL,
    "namingStrategy" TEXT NOT NULL,
    "brandabilityScore" INTEGER NOT NULL,
    "memorabilityScore" INTEGER NOT NULL,
    "seoScore" INTEGER NOT NULL,
    "lqsScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainPrice" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "registrar" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "affiliateUrl" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "domain" TEXT NOT NULL,
    "registrar" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(3),

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrademarkCache" (
    "id" TEXT NOT NULL,
    "domainName" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "resultJson" JSONB NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrademarkCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainPrice_suggestionId_registrar_key" ON "DomainPrice"("suggestionId", "registrar");

-- CreateIndex
CREATE UNIQUE INDEX "TrademarkCache_domainName_key" ON "TrademarkCache"("domainName");

-- CreateIndex
CREATE INDEX "TrademarkCache_domainName_idx" ON "TrademarkCache"("domainName");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainSuggestion" ADD CONSTRAINT "DomainSuggestion_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainPrice" ADD CONSTRAINT "DomainPrice_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "DomainSuggestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
