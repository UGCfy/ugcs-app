-- CreateTable
CREATE TABLE "MediaView" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "shopDomain" TEXT,
    "widgetId" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaClick" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "clickType" TEXT NOT NULL,
    "productId" TEXT,
    "shopDomain" TEXT,
    "widgetId" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaView_mediaId_idx" ON "MediaView"("mediaId");

-- CreateIndex
CREATE INDEX "MediaView_createdAt_idx" ON "MediaView"("createdAt");

-- CreateIndex
CREATE INDEX "MediaView_shopDomain_idx" ON "MediaView"("shopDomain");

-- CreateIndex
CREATE INDEX "MediaClick_mediaId_idx" ON "MediaClick"("mediaId");

-- CreateIndex
CREATE INDEX "MediaClick_productId_idx" ON "MediaClick"("productId");

-- CreateIndex
CREATE INDEX "MediaClick_createdAt_idx" ON "MediaClick"("createdAt");

-- CreateIndex
CREATE INDEX "MediaClick_shopDomain_idx" ON "MediaClick"("shopDomain");

-- AddForeignKey
ALTER TABLE "MediaView" ADD CONSTRAINT "MediaView_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaClick" ADD CONSTRAINT "MediaClick_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
