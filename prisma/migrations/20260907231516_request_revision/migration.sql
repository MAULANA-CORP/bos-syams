-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('OPEN', 'DONE');

-- CreateTable
CREATE TABLE "revision_requests" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "modul" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "prioritas" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" "RevisionStatus" NOT NULL DEFAULT 'OPEN',
    "imageData" TEXT,
    "imageName" TEXT,
    "imageMime" TEXT,
    "requestedById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_checklists" (
    "id" TEXT NOT NULL,
    "revisionRequestId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "revision_requests_nomor_key" ON "revision_requests"("nomor");

-- CreateIndex
CREATE INDEX "revision_requests_status_prioritas_idx" ON "revision_requests"("status", "prioritas");

-- CreateIndex
CREATE INDEX "revision_requests_requestedById_status_idx" ON "revision_requests"("requestedById", "status");

-- CreateIndex
CREATE INDEX "revision_checklists_revisionRequestId_isDone_idx" ON "revision_checklists"("revisionRequestId", "isDone");

-- AddForeignKey
ALTER TABLE "revision_requests" ADD CONSTRAINT "revision_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_checklists" ADD CONSTRAINT "revision_checklists_revisionRequestId_fkey" FOREIGN KEY ("revisionRequestId") REFERENCES "revision_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
