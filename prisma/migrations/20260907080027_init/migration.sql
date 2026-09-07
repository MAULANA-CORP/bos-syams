-- CreateEnum
CREATE TYPE "UserRoleCode" AS ENUM ('CEO', 'CMO_MANAGER', 'CMO_SUPPORT', 'PRODUCTION_CONTROLLER', 'PRODUCTION_USER', 'WAREHOUSE_PURCHASING', 'CFO', 'CHRO', 'QC', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "PortalRole" AS ENUM ('APPROVER', 'FINANCE', 'SHIPPING', 'VIEWER');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('VIEW', 'CREATE', 'EDIT', 'APPROVE', 'EXECUTE', 'OVERRIDE');

-- CreateEnum
CREATE TYPE "PermissionScope" AS ENUM ('ALL_COMPANY', 'DEPARTMENT', 'TEAM', 'ASSIGNED', 'PRODUCTION', 'INVENTORY', 'FINANCE', 'PEOPLE', 'QUALITY', 'CUSTOMER_OWN_DATA', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BuyerStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'HOLD', 'BLACKLIST');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('SAMPLE', 'PRODUCTION', 'SAMPLE_PRODUCTION');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'SPK_RELEASED', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED', 'SHIPPED', 'DELIVERED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PLANNED', 'RELEASED', 'IN_PROCESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('SHIPMENT_OUTSTANDING', 'PRICE_BELOW_MINIMUM', 'NEW_BUYER_CONTRACT', 'MAJOR_INVENTORY_ADJUSTMENT', 'CUSTOMER_RISK_COMPENSATION', 'CRITICAL_PEOPLE_ISSUE', 'CROSS_DEPT_DEADLOCK', 'INVESTMENT_EXPANSION', 'MAJOR_CASH_PURCHASE');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'VOID', 'REVERSE', 'CORRECT', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'EXPORT', 'PERMISSION_CHANGE');

-- CreateEnum
CREATE TYPE "ProcessCode" AS ENUM ('CUTTING', 'SORTING', 'PRINTING', 'EMBROIDERY', 'SEWING', 'ACCESSORIES', 'QC', 'PACKING', 'SHIPMENT');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('INTERNAL', 'MAKLOON', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "RateBasis" AS ENUM ('PER_PCS', 'PER_MINUTE');

-- CreateEnum
CREATE TYPE "ConfigType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'ENUM', 'JSON');

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "npwp" TEXT,
    "telepon" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "pinHash" TEXT,
    "email" TEXT,
    "googleSub" TEXT,
    "fotoUrl" TEXT,
    "departemen" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRoleCode" NOT NULL,
    "scope" "PermissionScope" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "role" "UserRoleCode" NOT NULL,
    "modul" TEXT NOT NULL,
    "aksi" "PermissionAction" NOT NULL,
    "scope" "PermissionScope" NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_policies" (
    "id" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "allowedRoles" "UserRoleCode"[],
    "catatan" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authority_matrix" (
    "id" TEXT NOT NULL,
    "decisionType" "ExceptionType" NOT NULL,
    "batasNominal" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "approverRole" "UserRoleCode" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authority_matrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_trails" (
    "id" TEXT NOT NULL,
    "entitasType" TEXT NOT NULL,
    "entitasId" TEXT NOT NULL,
    "aksi" "AuditAction" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "actorId" TEXT NOT NULL,
    "actorRole" "UserRoleCode",
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_trails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "sourceEntitas" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "assigneeId" TEXT,
    "assigneeRole" "UserRoleCode",
    "due" TIMESTAMP(3),
    "prioritas" INTEGER NOT NULL DEFAULT 3,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exception_cases" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tipe" "ExceptionType" NOT NULL,
    "sourceModul" TEXT NOT NULL,
    "referensiId" TEXT,
    "masalah" TEXT NOT NULL,
    "dampak" TEXT NOT NULL,
    "rekomendasi" TEXT,
    "requesterId" TEXT NOT NULL,
    "decisionOwnerRole" "UserRoleCode" NOT NULL,
    "keputusan" TEXT,
    "alasan" TEXT,
    "evidenceUrls" TEXT[],
    "status" "ExceptionStatus" NOT NULL DEFAULT 'DRAFT',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exception_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "company" TEXT,
    "country" TEXT,
    "defaultShipping" TEXT,
    "paymentTermId" TEXT,
    "cmoOwnerId" TEXT,
    "status" "BuyerStatus" NOT NULL DEFAULT 'PROSPECT',
    "holdReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_contacts" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT,
    "telepon" TEXT,
    "jabatan" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "quotationId" TEXT,
    "tipe" "OrderType" NOT NULL,
    "tanggalOrder" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "fxRate" DECIMAL(18,6),
    "fxRateDate" TIMESTAMP(3),
    "fxSource" TEXT,
    "commercialValue" DECIMAL(18,2),
    "baseCommercialValue" DECIMAL(18,2),
    "paymentTermId" TEXT,
    "cmoPicId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "isRepeat" BOOLEAN NOT NULL DEFAULT false,
    "sourceOrderId" TEXT,
    "spkReleasedAt" TIMESTAMP(3),
    "spkReleasedById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "garmentTypeId" TEXT,
    "colorId" TEXT,
    "mockupVersion" TEXT,
    "qty" INTEGER NOT NULL,
    "sampleRequired" BOOLEAN NOT NULL DEFAULT false,
    "deadline" TIMESTAMP(3),
    "businessPriority" INTEGER NOT NULL DEFAULT 3,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "size_breakdowns" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "size_breakdowns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batches" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "parentBatchId" TEXT,
    "plannedQty" INTEGER NOT NULL,
    "releasedQty" INTEGER NOT NULL DEFAULT 0,
    "currentQty" INTEGER NOT NULL DEFAULT 0,
    "locationId" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'PLANNED',
    "releasedAt" TIMESTAMP(3),
    "releasedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garment_types" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "size_sets" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "garmentTypeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "size_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sizes" (
    "id" TEXT NOT NULL,
    "sizeSetId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colors" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "hex" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "LocationType" NOT NULL DEFAULT 'INTERNAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_catalog" (
    "id" TEXT NOT NULL,
    "kode" "ProcessCode" NOT NULL,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_rates" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "garmentTypeId" TEXT,
    "rateBasis" "RateBasis",
    "rate" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "berlakuDari" TIMESTAMP(3),
    "berlakuSampai" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_terms" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "dpPersen" DECIMAL(5,2),
    "netHari" INTEGER,
    "keterangan" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carriers" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "isInternational" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kontak" TEXT,
    "telepon" TEXT,
    "email" TEXT,
    "alamat" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "spec" TEXT,
    "warna" TEXT,
    "uom" TEXT NOT NULL,
    "uomKonversi" DECIMAL(18,4),
    "uomDasar" TEXT,
    "supportLot" BOOLEAN NOT NULL DEFAULT false,
    "supplierId" TEXT,
    "lastPrice" DECIMAL(18,2),
    "avgCost" DECIMAL(18,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reject_categories" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reject_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "tipe" "ConfigType" NOT NULL DEFAULT 'STRING',
    "deskripsi" TEXT NOT NULL,
    "qidRef" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entities_kode_key" ON "entities"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_kode_key" ON "warehouses"("kode");

-- CreateIndex
CREATE INDEX "warehouses_entityId_idx" ON "warehouses"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleSub_key" ON "users"("googleSub");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "user_roles_role_idx" ON "user_roles"("role");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_role_key" ON "user_roles"("userId", "role");

-- CreateIndex
CREATE INDEX "permissions_role_idx" ON "permissions"("role");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_role_modul_aksi_key" ON "permissions"("role", "modul", "aksi");

-- CreateIndex
CREATE UNIQUE INDEX "field_policies_entitas_field_key" ON "field_policies"("entitas", "field");

-- CreateIndex
CREATE UNIQUE INDEX "authority_matrix_decisionType_approverRole_key" ON "authority_matrix"("decisionType", "approverRole");

-- CreateIndex
CREATE INDEX "audit_trails_entitasType_entitasId_idx" ON "audit_trails"("entitasType", "entitasId");

-- CreateIndex
CREATE INDEX "audit_trails_createdAt_idx" ON "audit_trails"("createdAt");

-- CreateIndex
CREATE INDEX "audit_trails_actorId_idx" ON "audit_trails"("actorId");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_status_idx" ON "tasks"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "tasks_assigneeRole_status_idx" ON "tasks"("assigneeRole", "status");

-- CreateIndex
CREATE INDEX "tasks_status_due_idx" ON "tasks"("status", "due");

-- CreateIndex
CREATE INDEX "tasks_sourceEntitas_sourceId_idx" ON "tasks"("sourceEntitas", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "exception_cases_nomor_key" ON "exception_cases"("nomor");

-- CreateIndex
CREATE INDEX "exception_cases_tipe_status_idx" ON "exception_cases"("tipe", "status");

-- CreateIndex
CREATE INDEX "exception_cases_status_idx" ON "exception_cases"("status");

-- CreateIndex
CREATE UNIQUE INDEX "buyers_kode_key" ON "buyers"("kode");

-- CreateIndex
CREATE INDEX "buyers_status_idx" ON "buyers"("status");

-- CreateIndex
CREATE INDEX "buyers_cmoOwnerId_idx" ON "buyers"("cmoOwnerId");

-- CreateIndex
CREATE INDEX "buyer_contacts_buyerId_idx" ON "buyer_contacts"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_nomor_key" ON "orders"("nomor");

-- CreateIndex
CREATE INDEX "orders_buyerId_status_idx" ON "orders"("buyerId", "status");

-- CreateIndex
CREATE INDEX "orders_status_deadline_idx" ON "orders"("status", "deadline");

-- CreateIndex
CREATE INDEX "orders_entityId_idx" ON "orders"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "articles_kode_key" ON "articles"("kode");

-- CreateIndex
CREATE INDEX "articles_orderId_idx" ON "articles"("orderId");

-- CreateIndex
CREATE INDEX "articles_garmentTypeId_idx" ON "articles"("garmentTypeId");

-- CreateIndex
CREATE INDEX "size_breakdowns_articleId_idx" ON "size_breakdowns"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "size_breakdowns_articleId_sizeId_key" ON "size_breakdowns"("articleId", "sizeId");

-- CreateIndex
CREATE UNIQUE INDEX "production_batches_nomor_key" ON "production_batches"("nomor");

-- CreateIndex
CREATE INDEX "production_batches_articleId_status_idx" ON "production_batches"("articleId", "status");

-- CreateIndex
CREATE INDEX "production_batches_locationId_idx" ON "production_batches"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "garment_types_kode_key" ON "garment_types"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "size_sets_kode_key" ON "size_sets"("kode");

-- CreateIndex
CREATE INDEX "size_sets_garmentTypeId_idx" ON "size_sets"("garmentTypeId");

-- CreateIndex
CREATE INDEX "sizes_sizeSetId_idx" ON "sizes"("sizeSetId");

-- CreateIndex
CREATE UNIQUE INDEX "sizes_sizeSetId_kode_key" ON "sizes"("sizeSetId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "colors_kode_key" ON "colors"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "locations_kode_key" ON "locations"("kode");

-- CreateIndex
CREATE INDEX "locations_tipe_idx" ON "locations"("tipe");

-- CreateIndex
CREATE UNIQUE INDEX "process_catalog_kode_key" ON "process_catalog"("kode");

-- CreateIndex
CREATE INDEX "process_rates_processId_idx" ON "process_rates"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "process_rates_processId_garmentTypeId_key" ON "process_rates"("processId", "garmentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_terms_kode_key" ON "payment_terms"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "carriers_kode_key" ON "carriers"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_kode_key" ON "suppliers"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "materials_kode_key" ON "materials"("kode");

-- CreateIndex
CREATE INDEX "materials_kategori_idx" ON "materials"("kategori");

-- CreateIndex
CREATE INDEX "materials_supplierId_idx" ON "materials"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "reject_categories_kode_key" ON "reject_categories"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_trails" ADD CONSTRAINT "audit_trails_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exception_cases" ADD CONSTRAINT "exception_cases_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exception_cases" ADD CONSTRAINT "exception_cases_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_cmoOwnerId_fkey" FOREIGN KEY ("cmoOwnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_contacts" ADD CONSTRAINT "buyer_contacts_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cmoPicId_fkey" FOREIGN KEY ("cmoPicId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_spkReleasedById_fkey" FOREIGN KEY ("spkReleasedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_garmentTypeId_fkey" FOREIGN KEY ("garmentTypeId") REFERENCES "garment_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "size_breakdowns" ADD CONSTRAINT "size_breakdowns_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "size_breakdowns" ADD CONSTRAINT "size_breakdowns_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_parentBatchId_fkey" FOREIGN KEY ("parentBatchId") REFERENCES "production_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "size_sets" ADD CONSTRAINT "size_sets_garmentTypeId_fkey" FOREIGN KEY ("garmentTypeId") REFERENCES "garment_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sizes" ADD CONSTRAINT "sizes_sizeSetId_fkey" FOREIGN KEY ("sizeSetId") REFERENCES "size_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_rates" ADD CONSTRAINT "process_rates_processId_fkey" FOREIGN KEY ("processId") REFERENCES "process_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_rates" ADD CONSTRAINT "process_rates_garmentTypeId_fkey" FOREIGN KEY ("garmentTypeId") REFERENCES "garment_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
