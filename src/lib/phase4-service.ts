import { catatAudit } from "@/lib/audit";
import { businessNumber } from "@/lib/numbering";
import { DomainError, type Actor } from "@/lib/domain-types";
import { getPrisma } from "@/lib/prisma";
import { assertBusinessAuthority } from "@/lib/rbac";
import { assertOptimisticVersion } from "@/lib/order-rules";
import { toDate } from "@/lib/date";

type AnyInput = Record<string, unknown>;

export async function listProcurementRequests() {
  return getPrisma().procurementRequest.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function createProcurementRequest(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "PROCUREMENT", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await tx.material.findUniqueOrThrow({ where: { id: String(input.materialId) } });
    const row = await tx.procurementRequest.create({
      data: {
        nomor: businessNumber("PR"),
        articleId: textOrNull(input.articleId),
        materialId: String(input.materialId),
        qtyNeeded: Number(input.qtyNeeded),
        uom: String(input.uom),
        neededBy: toDate(input.neededBy as string | null | undefined),
        requesterId: actor.id,
        approverRole: textOrNull(input.approverRole) as never,
        reason: textOrNull(input.reason),
        status: "REQUESTED",
      } as never,
    });
    await catatAudit({ entitasType: "ProcurementRequest", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function updateProcurementRequestStatus(id: string, input: { status: string; version: number; reason?: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "PROCUREMENT", "APPROVE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.procurementRequest.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    if (current.status !== "REQUESTED") throw new DomainError("PR hanya bisa diputus saat status REQUESTED", 409, "pr_status_not_requested");
    const row = await tx.procurementRequest.update({
      where: { id },
      data: { status: input.status as never, version: { increment: 1 } },
    });
    await catatAudit({ entitasType: "ProcurementRequest", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: input.reason ?? input.status, actor, ipAddress }, tx);
    return row;
  });
}

export async function listPurchaseOrders() {
  return getPrisma().purchaseOrder.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function createPurchaseOrder(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "PROCUREMENT", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const pr = await tx.procurementRequest.findUniqueOrThrow({ where: { id: String(input.procurementRequestId) } });
    if (pr.status !== "APPROVED") throw new DomainError("PO hanya bisa dibuat dari PR APPROVED", 409, "pr_not_approved");
    await tx.supplier.findUniqueOrThrow({ where: { id: String(input.supplierId) } });
    const row = await tx.purchaseOrder.create({
      data: {
        nomor: businessNumber("PO"),
        procurementRequestId: String(input.procurementRequestId),
        supplierId: String(input.supplierId),
        currency: String(input.currency ?? "IDR"),
        total: money(input.total),
        orderedAt: toDate(input.orderedAt as string | null | undefined) ?? new Date(),
        expectedAt: toDate(input.expectedAt as string | null | undefined),
        notes: textOrNull(input.notes),
        status: "ORDERED",
      } as never,
    });
    await tx.procurementRequest.update({ where: { id: pr.id }, data: { status: "ORDERED", version: { increment: 1 } } });
    await catatAudit({ entitasType: "PurchaseOrder", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function listGoodsReceipts() {
  return getPrisma().goodsReceipt.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function createGoodsReceipt(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "INVENTORY", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: String(input.purchaseOrderId) } });
    if (po.status !== "ORDERED") throw new DomainError("GR hanya bisa dibuat dari PO ORDERED", 409, "po_not_ordered");
    await tx.material.findUniqueOrThrow({ where: { id: String(input.materialId) } });
    await tx.warehouse.findUniqueOrThrow({ where: { id: String(input.warehouseId) } });
    const balanceBefore = await currentBalance(tx, String(input.materialId), String(input.warehouseId));
    const qtyReceived = Number(input.qtyReceived);
    const row = await tx.goodsReceipt.create({
      data: {
        nomor: businessNumber("GR"),
        purchaseOrderId: String(input.purchaseOrderId),
        materialId: String(input.materialId),
        warehouseId: String(input.warehouseId),
        qtyReceived,
        uom: String(input.uom),
        receivedAt: toDate(input.receivedAt as string | null | undefined) ?? new Date(),
        verifiedById: actor.id,
        status: "RECEIVED",
        notes: textOrNull(input.notes),
      } as never,
    });
    const ledger = await tx.inventoryLedger.create({
      data: {
        materialId: String(input.materialId),
        warehouseId: String(input.warehouseId),
        movement: "GR",
        qtyIn: qtyReceived,
        qtyOut: 0,
        balanceAfter: balanceBefore + qtyReceived,
        sourceType: "GoodsReceipt",
        sourceId: row.id,
        actorId: actor.id,
        notes: textOrNull(input.notes),
      } as never,
    });
    await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: "RECEIVED", version: { increment: 1 } } });
    await catatAudit({ entitasType: "GoodsReceipt", entitasId: row.id, aksi: "CREATE", newValue: { row, ledger }, actor, ipAddress }, tx);
    return row;
  });
}

export async function listInventoryLedger() {
  return getPrisma().inventoryLedger.findMany({ orderBy: [{ createdAt: "desc" }] });
}

export async function issueInventory(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "INVENTORY", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await tx.material.findUniqueOrThrow({ where: { id: String(input.materialId) } });
    await tx.warehouse.findUniqueOrThrow({ where: { id: String(input.warehouseId) } });
    const balanceBefore = await currentBalance(tx, String(input.materialId), String(input.warehouseId));
    const qtyOut = Number(input.qtyOut);
    if (balanceBefore - qtyOut < 0) {
      throw new DomainError("Issue ditolak: stok tidak boleh negatif", 409, "negative_stock_blocked", { balanceBefore, qtyOut });
    }
    const ledger = await tx.inventoryLedger.create({
      data: {
        materialId: String(input.materialId),
        warehouseId: String(input.warehouseId),
        movement: "ISSUE",
        qtyIn: 0,
        qtyOut,
        balanceAfter: balanceBefore - qtyOut,
        sourceType: textOrNull(input.sourceType) ?? "ManualIssue",
        sourceId: textOrNull(input.sourceId),
        actorId: actor.id,
        notes: textOrNull(input.notes),
      } as never,
    });
    await catatAudit({ entitasType: "InventoryLedger", entitasId: ledger.id, aksi: "CREATE", newValue: ledger, reason: "Issue material", actor, ipAddress }, tx);
    return ledger;
  });
}

async function currentBalance(tx: { inventoryLedger: { aggregate: (args: never) => Promise<unknown> } }, materialId: string, warehouseId: string) {
  const sums = await tx.inventoryLedger.aggregate({
    where: { materialId, warehouseId },
    _sum: { qtyIn: true, qtyOut: true },
  } as never) as { _sum?: { qtyIn?: unknown; qtyOut?: unknown } };
  return Number(sums._sum?.qtyIn ?? 0) - Number(sums._sum?.qtyOut ?? 0);
}

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function textOrNull(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
}
