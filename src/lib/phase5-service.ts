import { catatAudit } from "@/lib/audit";
import { toDate } from "@/lib/date";
import { DomainError, type Actor } from "@/lib/domain-types";
import { businessNumber } from "@/lib/numbering";
import { assertOptimisticVersion } from "@/lib/order-rules";
import { getPrisma } from "@/lib/prisma";
import { assertBusinessAuthority, hasAnyRole, maskSensitiveList } from "@/lib/rbac";

type AnyInput = Record<string, unknown>;

export async function listInvoices(actor: Actor) {
  await assertBusinessAuthority(actor, "INVOICE", "VIEW");
  const rows = await getPrisma().invoice.findMany({ orderBy: [{ updatedAt: "desc" }] });
  return maskSensitiveList(actor, rows as unknown as Record<string, unknown>[]);
}

export async function createInvoice(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "INVOICE", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const orderId = textOrNull(input.orderId);
    let buyerId = textOrNull(input.buyerId);
    if (orderId) {
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      buyerId = buyerId ?? order.buyerId;
    }
    if (!orderId && !buyerId) throw new DomainError("Invoice wajib memilih Order atau Buyer", 422, "invoice_target_required");

    const row = await tx.invoice.create({
      data: {
        nomor: businessNumber("INV"),
        orderId,
        buyerId,
        currency: String(input.currency ?? "IDR").toUpperCase(),
        amount: money(input.amount) ?? 0,
        baseAmount: money(input.baseAmount),
        dueDate: toDate(input.dueDate as string | null | undefined),
        issuedAt: toDate(input.issuedAt as string | null | undefined) ?? new Date(),
        status: "ISSUED",
        collectionNotes: textOrNull(input.collectionNotes),
        issuedById: actor.id,
      } as never,
    });
    await catatAudit({ entitasType: "Invoice", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function voidInvoice(id: string, input: { version: number; reason: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "INVOICE", "APPROVE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.invoice.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    if (current.status === "PAID") throw new DomainError("Invoice PAID tidak bisa di-void dari flow ini", 409, "paid_invoice_void_denied");
    if (current.status === "VOID") throw new DomainError("Invoice sudah VOID", 409, "invoice_already_void");
    const row = await tx.invoice.update({
      where: { id },
      data: { status: "VOID", version: { increment: 1 } },
    });
    await catatAudit({ entitasType: "Invoice", entitasId: id, aksi: "VOID", oldValue: current, newValue: row, reason: input.reason, actor, ipAddress }, tx);
    return row;
  });
}

export async function listPayments() {
  await getPrisma();
  return getPrisma().payment.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function reportPayment(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "PAYMENT", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: String(input.invoiceId) } });
    if (invoice.status === "VOID") throw new DomainError("Payment tidak bisa dicatat untuk invoice VOID", 409, "invoice_void");
    const row = await tx.payment.create({
      data: {
        nomor: businessNumber("PAY"),
        invoiceId: invoice.id,
        currency: String(input.currency ?? invoice.currency).toUpperCase(),
        amount: money(input.amount) ?? 0,
        reportedAt: toDate(input.reportedAt as string | null | undefined) ?? new Date(),
        status: "REPORTED",
        reportedById: actor.id,
        evidenceUrl: textOrNull(input.evidenceUrl),
        notes: textOrNull(input.notes),
      } as never,
    });
    await catatAudit({ entitasType: "Payment", entitasId: row.id, aksi: "CREATE", newValue: row, reason: "Payment claim reported", actor, ipAddress }, tx);
    return row;
  });
}

export async function decidePayment(id: string, input: { status: string; version: number; reason: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "PAYMENT", "APPROVE");
  if (!hasAnyRole(actor, ["CFO"])) {
    throw new DomainError("Hanya CFO yang boleh verify/reject payment", 403, "payment_verification_denied");
  }
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    if (current.status !== "REPORTED") throw new DomainError("Payment hanya bisa diputus saat REPORTED", 409, "payment_not_reported");
    const row = await tx.payment.update({
      where: { id },
      data: {
        status: input.status as never,
        verifiedAt: new Date(),
        verifiedById: actor.id,
        notes: input.reason,
        version: { increment: 1 },
      } as never,
    });

    let invoice = null;
    if (current.invoiceId) {
      invoice = await recalculateInvoiceStatus(tx, current.invoiceId);
      await refreshBlockedShipments(tx, current.invoiceId);
    }
    await catatAudit({ entitasType: "Payment", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: { payment: row, invoice }, reason: input.reason, actor, ipAddress }, tx);
    return row;
  });
}

export async function listShipments() {
  return getPrisma().shipment.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function createShipment(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "SHIPMENT", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: String(input.orderId) } });
    const packingJobId = textOrNull(input.packingJobId);
    if (!packingJobId) throw new DomainError("Shipment wajib memilih packing job GOODS_READY", 422, "packing_job_required");
    const packing = await tx.packingJob.findUniqueOrThrow({ where: { id: packingJobId } });
    if (packing.status !== "GOODS_READY") throw new DomainError("Shipment hanya bisa memakai packing job GOODS_READY", 409, "packing_not_goods_ready");
    if (Number(input.packedQty) > packing.packedQty) throw new DomainError("Qty shipment melebihi packed qty", 422, "shipment_qty_too_large");
    const carrierId = textOrNull(input.carrierId);
    if (carrierId) await tx.carrier.findUniqueOrThrow({ where: { id: carrierId } });
    const gate = await orderPaymentGate(tx, order.id);
    const row = await tx.shipment.create({
      data: {
        nomor: businessNumber("SHP"),
        orderId: order.id,
        carrierId,
        packingJobId,
        packedQty: Number(input.packedQty),
        paymentGateStatus: gate,
        status: gate === "CLEARED" ? "READY_TO_SHIP" : "BLOCKED_BY_PAYMENT",
        scheduledAt: toDate(input.scheduledAt as string | null | undefined),
        trackingNo: textOrNull(input.trackingNo),
        notes: textOrNull(input.notes),
      } as never,
    });
    await catatAudit({ entitasType: "Shipment", entitasId: row.id, aksi: "CREATE", newValue: row, reason: gate, actor, ipAddress }, tx);
    return row;
  });
}

export async function updateShipmentStatus(id: string, input: { status: string; version: number; trackingNo?: unknown; reason?: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "SHIPMENT", "EXECUTE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.shipment.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    if (input.status === "SHIPPED" && !["READY_TO_SHIP", "EXCEPTION_RELEASED"].includes(current.status)) {
      throw new DomainError("Shipment hanya bisa dikirim setelah READY_TO_SHIP atau EXCEPTION_RELEASED", 409, "shipment_not_ready");
    }
    if (input.status === "DELIVERED" && current.status !== "SHIPPED") {
      throw new DomainError("Shipment hanya bisa DELIVERED setelah SHIPPED", 409, "shipment_not_shipped");
    }
    const row = await tx.shipment.update({
      where: { id },
      data: {
        status: input.status as never,
        trackingNo: textOrNull(input.trackingNo) ?? current.trackingNo,
        shippedAt: input.status === "SHIPPED" ? new Date() : current.shippedAt,
        deliveredAt: input.status === "DELIVERED" ? new Date() : current.deliveredAt,
        version: { increment: 1 },
      } as never,
    });
    if (row.orderId) {
      await tx.order.update({
        where: { id: row.orderId },
        data: { status: input.status === "DELIVERED" ? "DELIVERED" : "SHIPPED", version: { increment: 1 } },
      });
    }
    await catatAudit({ entitasType: "Shipment", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: input.reason ?? input.status, actor, ipAddress }, tx);
    return row;
  });
}

export async function releaseShipmentByException(id: string, input: { exceptionId: string; version: number; reason: string }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "SHIPMENT", "OVERRIDE");
  if (!hasAnyRole(actor, ["CEO"])) throw new DomainError("Release shipment outstanding hanya boleh CEO", 403, "shipment_exception_release_denied");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.shipment.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    if (current.status !== "BLOCKED_BY_PAYMENT") throw new DomainError("Hanya shipment BLOCKED_BY_PAYMENT yang butuh exception release", 409, "shipment_not_blocked");
    const exception = await tx.exceptionCase.findUniqueOrThrow({ where: { id: input.exceptionId } });
    if (
      exception.tipe !== "SHIPMENT_OUTSTANDING" ||
      exception.status !== "APPROVED" ||
      exception.sourceModul !== "SHIPMENT" ||
      exception.referensiId !== id
    ) {
      throw new DomainError("Exception harus SHIPMENT_OUTSTANDING, APPROVED, source SHIPMENT, dan referensi shipment ini", 409, "invalid_shipment_exception");
    }
    const row = await tx.shipment.update({
      where: { id },
      data: {
        status: "EXCEPTION_RELEASED",
        paymentGateStatus: "CEO_EXCEPTION_RELEASED_OUTSTANDING",
        releasedByExceptionId: exception.id,
        notes: [current.notes, input.reason].filter(Boolean).join(" | "),
        version: { increment: 1 },
      } as never,
    });
    await catatAudit({ entitasType: "Shipment", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: input.reason, actor, ipAddress }, tx);
    return row;
  });
}

async function recalculateInvoiceStatus(tx: AnyTx, invoiceId: string) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (invoice.status === "VOID") return invoice;
  const verified = await tx.payment.aggregate({
    where: { invoiceId, status: "VERIFIED" },
    _sum: { amount: true },
  });
  const paidAmount = Number(verified._sum.amount ?? 0);
  const total = Number(invoice.amount ?? 0);
  const nextStatus = paidAmount >= total ? "PAID" : paidAmount > 0 ? "PARTIALLY_PAID" : isPastDue(invoice.dueDate) ? "OUTSTANDING" : "ISSUED";
  if (invoice.status === nextStatus) return invoice;
  return tx.invoice.update({ where: { id: invoiceId }, data: { status: nextStatus as never, version: { increment: 1 } } });
}

async function refreshBlockedShipments(tx: AnyTx, invoiceId: string) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (!invoice.orderId) return;
  const gate = await orderPaymentGate(tx, invoice.orderId);
  if (gate !== "CLEARED") return;
  await tx.shipment.updateMany({
    where: { orderId: invoice.orderId, status: "BLOCKED_BY_PAYMENT" },
    data: { status: "READY_TO_SHIP", paymentGateStatus: "CLEARED" },
  });
}

async function orderPaymentGate(tx: AnyTx, orderId: string) {
  const invoices = await tx.invoice.findMany({ where: { orderId, status: { not: "VOID" } } });
  if (invoices.length === 0) return "NO_INVOICE";
  return invoices.every((invoice: { status: string }) => invoice.status === "PAID") ? "CLEARED" : "OUTSTANDING";
}

function isPastDue(value: Date | null) {
  return value !== null && value.getTime() < Date.now();
}

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100) / 100;
}

function textOrNull(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

type AnyTx = {
  invoice: {
    findUniqueOrThrow: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  payment: {
    create: (args: any) => Promise<any>;
    findUniqueOrThrow: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    aggregate: (args: any) => Promise<any>;
  };
  shipment: {
    create: (args: any) => Promise<any>;
    findUniqueOrThrow: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    updateMany: (args: any) => Promise<any>;
  };
  order: { findUniqueOrThrow: (args: any) => Promise<any>; update: (args: any) => Promise<any> };
  packingJob: { findUniqueOrThrow: (args: any) => Promise<any> };
  carrier: { findUniqueOrThrow: (args: any) => Promise<any> };
  exceptionCase: { findUniqueOrThrow: (args: any) => Promise<any> };
};
