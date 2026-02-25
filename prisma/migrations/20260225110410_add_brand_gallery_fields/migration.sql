-- AlterTable
ALTER TABLE "BrandSession" ADD COLUMN     "showInGallery" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "BrandSession_userId_idx" ON "BrandSession"("userId");

-- CreateIndex
CREATE INDEX "BrandSession_showInGallery_status_idx" ON "BrandSession"("showInGallery", "status");
