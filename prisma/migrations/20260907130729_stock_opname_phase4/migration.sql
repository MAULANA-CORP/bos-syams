-- CreateEnum
CREATE TYPE "StockOpnameStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'APPLIED');

-- CreateTable
CREATE TABLE "stock_opnames" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "systemQty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "countedQty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "differenceQty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "evidenceUrl" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "StockOpnameStatus" NOT NULL DEFAULT 'SUBMITTED',
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "appliedById" TEXT,
    "appliedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_opnames_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_opnames_nomor_key" ON "stock_opnames"("nomor");

-- CreateIndex
CREATE INDEX "stock_opnames_warehouseId_status_idx" ON "stock_opnames"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "stock_opnames_materialId_countedAt_idx" ON "stock_opnames"("materialId", "countedAt");
