-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProcurementStatus" AS ENUM ('REQUESTED', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('GR', 'ISSUE', 'ADJUSTMENT', 'RESERVE', 'RELEASE');

-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('SENT', 'RECEIVED', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "QcStatus" AS ENUM ('PENDING', 'PASS', 'REJECT', 'REWORK');

-- CreateEnum
CREATE TYPE "PackingStatus" AS ENUM ('OPEN', 'PACKED', 'GOODS_READY');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'BLOCKED_BY_PAYMENT', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'EXCEPTION_RELEASED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OUTSTANDING', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('REPORTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PortalTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('REQUESTED', 'SENT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MakloonStatus" AS ENUM ('PLANNED', 'SENT', 'RECEIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "buyerId" TEXT,
    "orderId" TEXT,
    "articleId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "estimatedHpp" DECIMAL(18,2),
    "markupPercent" DECIMAL(5,2),
    "minimumPrice" DECIMAL(18,2),
    "offeredPrice" DECIMAL(18,2),
    "baseOfferedPrice" DECIMAL(18,2),
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "approvedByRole" "UserRoleCode",
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_handoffs" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "batchId" TEXT,
    "fromProcess" "ProcessCode",
    "toProcess" "ProcessCode",
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "qtySent" INTEGER NOT NULL DEFAULT 0,
    "qtyReceived" INTEGER,
    "discrepancyQty" INTEGER,
    "status" "HandoffStatus" NOT NULL DEFAULT 'SENT',
    "sentById" TEXT,
    "receivedById" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_inspections" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "batchId" TEXT,
    "articleId" TEXT,
    "sizeId" TEXT,
    "inspectedQty" INTEGER NOT NULL DEFAULT 0,
    "passQty" INTEGER NOT NULL DEFAULT 0,
    "rejectQty" INTEGER NOT NULL DEFAULT 0,
    "rejectCategoryId" TEXT,
    "status" "QcStatus" NOT NULL DEFAULT 'PENDING',
    "inspectorId" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packing_jobs" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "batchId" TEXT,
    "articleId" TEXT,
    "qtyToPack" INTEGER NOT NULL DEFAULT 0,
    "packedQty" INTEGER NOT NULL DEFAULT 0,
    "status" "PackingStatus" NOT NULL DEFAULT 'OPEN',
    "labelCode" TEXT,
    "packedById" TEXT,
    "goodsReadyAt" TIMESTAMP(3),
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_requests" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "articleId" TEXT,
    "materialId" TEXT,
    "qtyNeeded" DECIMAL(18,4),
    "uom" TEXT,
    "neededBy" TIMESTAMP(3),
    "requesterId" TEXT,
    "approverRole" "UserRoleCode",
    "status" "ProcurementStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "procurementRequestId" TEXT,
    "supplierId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "total" DECIMAL(18,2),
    "status" "ProcurementStatus" NOT NULL DEFAULT 'ORDERED',
    "orderedAt" TIMESTAMP(3),
    "expectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "materialId" TEXT,
    "warehouseId" TEXT,
    "qtyReceived" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "uom" TEXT,
    "receivedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "status" "ProcurementStatus" NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_ledger" (
    "id" TEXT NOT NULL,
    "materialId" TEXT,
    "warehouseId" TEXT,
    "movement" "MovementType" NOT NULL,
    "qtyIn" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "qtyOut" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "balanceAfter" DECIMAL(18,4),
    "sourceType" TEXT,
    "sourceId" TEXT,
    "actorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "orderId" TEXT,
    "buyerId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "baseAmount" DECIMAL(18,2),
    "dueDate" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "collectionNotes" TEXT,
    "issuedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "invoiceId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reportedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'REPORTED',
    "reportedById" TEXT,
    "verifiedById" TEXT,
    "evidenceUrl" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "orderId" TEXT,
    "carrierId" TEXT,
    "packingJobId" TEXT,
    "packedQty" INTEGER NOT NULL DEFAULT 0,
    "paymentGateStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "trackingNo" TEXT,
    "releasedByExceptionId" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_accounts" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "buyerContactId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "portalRole" "PortalRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_tickets" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "buyerId" TEXT,
    "orderId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT,
    "status" "PortalTicketStatus" NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_pipelines" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "buyerId" TEXT,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'LEAD',
    "nextFollowUp" TIMESTAMP(3),
    "ownerId" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_approvals" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "articleId" TEXT,
    "buyerId" TEXT,
    "status" "SampleStatus" NOT NULL DEFAULT 'REQUESTED',
    "sentAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sample_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "makloon_jobs" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "batchId" TEXT,
    "supplierId" TEXT,
    "processId" TEXT,
    "unitPrice" DECIMAL(18,2),
    "total" DECIMAL(18,2),
    "qtySent" INTEGER NOT NULL DEFAULT 0,
    "qtyReceived" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "status" "MakloonStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "makloon_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "nik" TEXT,
    "nama" TEXT NOT NULL,
    "departemen" TEXT,
    "roleTitle" TEXT,
    "salaryLevel" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manpower_plans" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "departemen" TEXT NOT NULL,
    "plannedPeople" INTEGER NOT NULL DEFAULT 0,
    "actualPeople" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manpower_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_nomor_key" ON "quotations"("nomor");

-- CreateIndex
CREATE INDEX "quotations_buyerId_status_idx" ON "quotations"("buyerId", "status");

-- CreateIndex
CREATE INDEX "quotations_orderId_idx" ON "quotations"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "production_handoffs_nomor_key" ON "production_handoffs"("nomor");

-- CreateIndex
CREATE INDEX "production_handoffs_batchId_status_idx" ON "production_handoffs"("batchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quality_inspections_nomor_key" ON "quality_inspections"("nomor");

-- CreateIndex
CREATE INDEX "quality_inspections_batchId_status_idx" ON "quality_inspections"("batchId", "status");

-- CreateIndex
CREATE INDEX "quality_inspections_articleId_idx" ON "quality_inspections"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "packing_jobs_nomor_key" ON "packing_jobs"("nomor");

-- CreateIndex
CREATE INDEX "packing_jobs_batchId_status_idx" ON "packing_jobs"("batchId", "status");

-- CreateIndex
CREATE INDEX "packing_jobs_articleId_idx" ON "packing_jobs"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_requests_nomor_key" ON "procurement_requests"("nomor");

-- CreateIndex
CREATE INDEX "procurement_requests_status_neededBy_idx" ON "procurement_requests"("status", "neededBy");

-- CreateIndex
CREATE INDEX "procurement_requests_materialId_idx" ON "procurement_requests"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_nomor_key" ON "purchase_orders"("nomor");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_status_idx" ON "purchase_orders"("supplierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_nomor_key" ON "goods_receipts"("nomor");

-- CreateIndex
CREATE INDEX "goods_receipts_materialId_receivedAt_idx" ON "goods_receipts"("materialId", "receivedAt");

-- CreateIndex
CREATE INDEX "goods_receipts_warehouseId_idx" ON "goods_receipts"("warehouseId");

-- CreateIndex
CREATE INDEX "inventory_ledger_materialId_createdAt_idx" ON "inventory_ledger"("materialId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_ledger_sourceType_sourceId_idx" ON "inventory_ledger"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_nomor_key" ON "invoices"("nomor");

-- CreateIndex
CREATE INDEX "invoices_orderId_status_idx" ON "invoices"("orderId", "status");

-- CreateIndex
CREATE INDEX "invoices_buyerId_dueDate_idx" ON "invoices"("buyerId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "payments_nomor_key" ON "payments"("nomor");

-- CreateIndex
CREATE INDEX "payments_invoiceId_status_idx" ON "payments"("invoiceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_nomor_key" ON "shipments"("nomor");

-- CreateIndex
CREATE INDEX "shipments_orderId_status_idx" ON "shipments"("orderId", "status");

-- CreateIndex
CREATE INDEX "shipments_carrierId_idx" ON "shipments"("carrierId");

-- CreateIndex
CREATE UNIQUE INDEX "portal_accounts_email_key" ON "portal_accounts"("email");

-- CreateIndex
CREATE INDEX "portal_accounts_buyerId_portalRole_idx" ON "portal_accounts"("buyerId", "portalRole");

-- CreateIndex
CREATE UNIQUE INDEX "portal_tickets_nomor_key" ON "portal_tickets"("nomor");

-- CreateIndex
CREATE INDEX "portal_tickets_buyerId_status_idx" ON "portal_tickets"("buyerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "crm_pipelines_nomor_key" ON "crm_pipelines"("nomor");

-- CreateIndex
CREATE INDEX "crm_pipelines_buyerId_stage_idx" ON "crm_pipelines"("buyerId", "stage");

-- CreateIndex
CREATE INDEX "crm_pipelines_ownerId_nextFollowUp_idx" ON "crm_pipelines"("ownerId", "nextFollowUp");

-- CreateIndex
CREATE UNIQUE INDEX "sample_approvals_nomor_key" ON "sample_approvals"("nomor");

-- CreateIndex
CREATE INDEX "sample_approvals_articleId_status_idx" ON "sample_approvals"("articleId", "status");

-- CreateIndex
CREATE INDEX "sample_approvals_buyerId_idx" ON "sample_approvals"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "makloon_jobs_nomor_key" ON "makloon_jobs"("nomor");

-- CreateIndex
CREATE INDEX "makloon_jobs_batchId_status_idx" ON "makloon_jobs"("batchId", "status");

-- CreateIndex
CREATE INDEX "makloon_jobs_supplierId_idx" ON "makloon_jobs"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_nik_key" ON "employees"("nik");

-- CreateIndex
CREATE INDEX "employees_departemen_status_idx" ON "employees"("departemen", "status");

-- CreateIndex
CREATE INDEX "manpower_plans_tanggal_departemen_idx" ON "manpower_plans"("tanggal", "departemen");
