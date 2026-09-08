-- CreateEnum
CREATE TYPE "OrderChangeType" AS ENUM ('CHANGE', 'CANCELLATION');

-- CreateEnum
CREATE TYPE "OrderChangeStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SlaStatus" AS ENUM ('ON_TRACK', 'WARNING', 'OVERDUE', 'COMPLETED');

-- AlterTable
ALTER TABLE "payment_terms" ADD COLUMN     "balanceTrigger" TEXT,
ADD COLUMN     "dpTrigger" TEXT,
ADD COLUMN     "dueBasis" TEXT;

-- CreateTable
CREATE TABLE "order_change_requests" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "jenis" "OrderChangeType" NOT NULL,
    "alasan" TEXT NOT NULL,
    "dampak" TEXT,
    "requestedChanges" JSONB,
    "disposition" TEXT,
    "financialTreatment" TEXT,
    "evidenceUrls" TEXT[],
    "status" "OrderChangeStatus" NOT NULL DEFAULT 'SUBMITTED',
    "requesterId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "appliedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_change_reviews" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "role" "UserRoleCode" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "notes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_change_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_rules" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "orderType" TEXT,
    "targetMinutes" INTEGER NOT NULL,
    "startTrigger" TEXT NOT NULL,
    "stopTrigger" TEXT NOT NULL,
    "warningThreshold" INTEGER NOT NULL DEFAULT 80,
    "escalationRule" TEXT,
    "ownerRole" "UserRoleCode",
    "workingCalendar" TEXT NOT NULL DEFAULT 'BUSINESS',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_instances" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "sourceEntitas" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "taskId" TEXT,
    "ownerId" TEXT,
    "slaStart" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "elapsedMinutes" INTEGER,
    "status" "SlaStatus" NOT NULL DEFAULT 'ON_TRACK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegations" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "effectiveStart" TIMESTAMP(3) NOT NULL,
    "effectiveEnd" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_change_requests_nomor_key" ON "order_change_requests"("nomor");

-- CreateIndex
CREATE INDEX "order_change_requests_orderId_status_idx" ON "order_change_requests"("orderId", "status");

-- CreateIndex
CREATE INDEX "order_change_requests_status_jenis_idx" ON "order_change_requests"("status", "jenis");

-- CreateIndex
CREATE INDEX "order_change_reviews_role_status_idx" ON "order_change_reviews"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "order_change_reviews_requestId_role_key" ON "order_change_reviews"("requestId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "sla_rules_kode_key" ON "sla_rules"("kode");

-- CreateIndex
CREATE INDEX "sla_rules_process_active_idx" ON "sla_rules"("process", "active");

-- CreateIndex
CREATE INDEX "sla_rules_effectiveFrom_effectiveTo_idx" ON "sla_rules"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "sla_instances_taskId_key" ON "sla_instances"("taskId");

-- CreateIndex
CREATE INDEX "sla_instances_status_dueAt_idx" ON "sla_instances"("status", "dueAt");

-- CreateIndex
CREATE INDEX "sla_instances_sourceEntitas_sourceId_idx" ON "sla_instances"("sourceEntitas", "sourceId");

-- CreateIndex
CREATE INDEX "delegations_fromUserId_effectiveStart_effectiveEnd_idx" ON "delegations"("fromUserId", "effectiveStart", "effectiveEnd");

-- CreateIndex
CREATE INDEX "delegations_toUserId_effectiveStart_effectiveEnd_idx" ON "delegations"("toUserId", "effectiveStart", "effectiveEnd");

-- AddForeignKey
ALTER TABLE "order_change_requests" ADD CONSTRAINT "order_change_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_change_requests" ADD CONSTRAINT "order_change_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_change_reviews" ADD CONSTRAINT "order_change_reviews_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "order_change_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_change_reviews" ADD CONSTRAINT "order_change_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_instances" ADD CONSTRAINT "sla_instances_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "sla_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_instances" ADD CONSTRAINT "sla_instances_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_instances" ADD CONSTRAINT "sla_instances_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
