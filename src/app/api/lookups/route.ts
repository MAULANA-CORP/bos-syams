import { getPrisma } from "@/lib/prisma";
import { ok, withAuth } from "@/lib/api-helpers";
import { hasAnyRole } from "@/lib/rbac";
import type { Actor } from "@/lib/domain-types";

export const dynamic = "force-dynamic";

/**
 * Filtered lookups — hanya mengembalikan data yang role-nya boleh lihat.
 * Mengurangi risiko data leakage ke role yang tidak seharusnya melihat.
 */
export const GET = withAuth(async ({ actor }) => {
  const prisma = getPrisma();

  // Base data — semua role boleh lihat (untuk dropdown umum)
  const [entities, warehouses, users, processCatalog, sizes, colors, locations] = await Promise.all([
    prisma.entity.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
    prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { nama: "asc" }, select: { id: true, nama: true, username: true } }),
    prisma.processCatalog.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" } }),
    prisma.size.findMany({ where: { isActive: true }, orderBy: [{ sizeSetId: "asc" }, { urutan: "asc" }] }),
    prisma.color.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
  ]);

  const result: Record<string, unknown> = {
    entities, warehouses, users, processCatalog, sizes, colors, locations,
  };

  // Commercial data — CMO, CFO, CEO
  if (hasAnyRole(actor, ["CMO_MANAGER", "CMO_SUPPORT", "CFO", "CEO"])) {
    const [buyers, garmentTypes, sizeSets, paymentTerms, articles, orders] = await Promise.all([
      prisma.buyer.findMany({ orderBy: { nama: "asc" } }),
      prisma.garmentType.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
      prisma.sizeSet.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
      prisma.paymentTerm.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
      prisma.article.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, kode: true, nama: true, qty: true } }),
      prisma.order.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, status: true, buyerId: true, buyer: { select: { nama: true } } } }),
    ]);
    Object.assign(result, { buyers, garmentTypes, sizeSets, paymentTerms, articles, orders });
  }

  // Production data — COO, Production, QC, Warehouse, CMO (view)
  if (hasAnyRole(actor, ["PRODUCTION_CONTROLLER", "PRODUCTION_USER", "QC", "WAREHOUSE_PURCHASING", "CMO_MANAGER", "CEO"])) {
    const [batches, rejectCategories, qualityInspections, packingJobs] = await Promise.all([
      prisma.productionBatch.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, status: true, plannedQty: true, article: { select: { nama: true } } } }),
      prisma.rejectCategory.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
      prisma.qualityInspection.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, status: true, batchId: true, articleId: true } }),
      prisma.packingJob.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, status: true, qtyToPack: true, packedQty: true } }),
    ]);
    Object.assign(result, { batches, rejectCategories, qualityInspections, packingJobs });
  }

  // Inventory data — Warehouse, CFO, CEO
  if (hasAnyRole(actor, ["WAREHOUSE_PURCHASING", "CFO", "CEO"])) {
    const [materials, suppliers, procurementRequests, purchaseOrders] = await Promise.all([
      prisma.material.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
      prisma.supplier.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
      prisma.procurementRequest.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, status: true, materialId: true, qtyNeeded: true, uom: true } }),
      prisma.purchaseOrder.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, status: true, procurementRequestId: true, supplierId: true } }),
    ]);
    Object.assign(result, { materials, suppliers, procurementRequests, purchaseOrders });
  }

  // Logistics data — CMO, Warehouse, CFO, CEO
  if (hasAnyRole(actor, ["CMO_MANAGER", "WAREHOUSE_PURCHASING", "CFO", "CEO"])) {
    const [carriers, shipments] = await Promise.all([
      prisma.carrier.findMany({ where: { isActive: true }, orderBy: { nama: "asc" } }),
      prisma.shipment.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, status: true, orderId: true } }),
    ]);
    Object.assign(result, { carriers, shipments });
  }

  // Finance data — CFO, CEO only
  if (hasAnyRole(actor, ["CFO", "CEO"])) {
    const invoices = await prisma.invoice.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, nomor: true, status: true, orderId: true, buyerId: true, amount: true, currency: true },
    });
    Object.assign(result, { invoices });
  }

  // Portal data — CMO, CEO
  if (hasAnyRole(actor, ["CMO_MANAGER", "CMO_SUPPORT", "CEO"])) {
    const portalAccounts = await prisma.portalAccount.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, buyerId: true, email: true, portalRole: true, isActive: true },
    });
    Object.assign(result, { portalAccounts });
  }

  // CRM data — CMO, CEO
  if (hasAnyRole(actor, ["CMO_MANAGER", "CMO_SUPPORT", "CEO"])) {
    const [crmPipelines, sampleApprovals] = await Promise.all([
      prisma.crmPipeline.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, buyerId: true, title: true, stage: true, nextFollowUp: true, ownerId: true } }),
      prisma.sampleApproval.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nomor: true, articleId: true, buyerId: true, status: true } }),
    ]);
    Object.assign(result, { crmPipelines, sampleApprovals });
  }

  // Makloon data — Production, Warehouse, CFO, CEO
  if (hasAnyRole(actor, ["PRODUCTION_CONTROLLER", "WAREHOUSE_PURCHASING", "CFO", "CEO"])) {
    const makloonJobs = await prisma.makloonJob.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, nomor: true, batchId: true, supplierId: true, status: true },
    });
    Object.assign(result, { makloonJobs });
  }

  // People data — CHRO, CEO
  if (hasAnyRole(actor, ["CHRO", "CEO"])) {
    const [employees, manpowerPlans] = await Promise.all([
      prisma.employee.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, nama: true, departemen: true, roleTitle: true, status: true } }),
      prisma.manpowerPlan.findMany({ orderBy: [{ tanggal: "desc" }, { departemen: "asc" }], select: { id: true, tanggal: true, departemen: true, plannedPeople: true, actualPeople: true } }),
    ]);
    Object.assign(result, { employees, manpowerPlans });
  }

  return ok(result);
});
