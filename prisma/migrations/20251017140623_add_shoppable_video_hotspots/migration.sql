-- CreateTable
CREATE TABLE "ProductHotspot" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "timestamp" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductHotspot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductHotspot_mediaId_idx" ON "ProductHotspot"("mediaId");

-- CreateIndex
CREATE INDEX "ProductHotspot_timestamp_idx" ON "ProductHotspot"("timestamp");

-- AddForeignKey
ALTER TABLE "ProductHotspot" ADD CONSTRAINT "ProductHotspot_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
