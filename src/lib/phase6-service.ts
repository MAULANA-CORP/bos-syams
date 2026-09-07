import bcrypt from "bcryptjs";
import { catatAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/lib/domain-types";
import { businessNumber } from "@/lib/numbering";
import { assertOptimisticVersion } from "@/lib/order-rules";
import { getPrisma } from "@/lib/prisma";
import { assertBusinessAuthority } from "@/lib/rbac";

type AnyInput = Record<string, unknown>;
export type PortalActor = { id: string; buyerId: string; email: string; role: string };

export async function listPortalAccounts() {
  return getPrisma().portalAccount.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      buyerId: true,
      buyerContactId: true,
      email: true,
      portalRole: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listPortalTickets() {
  return getPrisma().portalTicket.findMany({ orderBy: [{ updatedAt: "desc" }] });
}

export async function createPortalAccount(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "PORTAL", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await tx.buyer.findUniqueOrThrow({ where: { id: String(input.buyerId) } });
    const row = await tx.portalAccount.create({
      data: {
        buyerId: String(input.buyerId),
        buyerContactId: textOrNull(input.buyerContactId),
        email: String(input.email).toLowerCase(),
        passwordHash: await bcrypt.hash(String(input.password), 10),
        portalRole: String(input.portalRole ?? "VIEWER") as never,
        isActive: true,
      } as never,
    });
    await catatAudit({ entitasType: "PortalAccount", entitasId: row.id, aksi: "CREATE", newValue: { ...row, passwordHash: "[HASHED]" }, actor, ipAddress }, tx);
    return { ...row, passwordHash: null };
  });
}

export async function authenticatePortal(email: string, password: string) {
  const prisma = getPrisma();
  const account = await prisma.portalAccount.findUnique({ where: { email: email.toLowerCase() } });
  const valid = account?.passwordHash ? await bcrypt.compare(password, account.passwordHash) : false;
  if (!account || !valid || !account.isActive) throw new DomainError("Email atau password portal salah", 401, "portal_invalid_credentials");
  await prisma.portalAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
  return { id: account.id, buyerId: account.buyerId, email: account.email, role: account.portalRole };
}

export async function getPortalDashboard(portal: PortalActor) {
  const prisma = getPrisma();
  const [buyer, orders, sampleApprovals, invoices, tickets] = await Promise.all([
    prisma.buyer.findUnique({ where: { id: portal.buyerId }, select: { id: true, kode: true, nama: true, company: true, country: true, defaultShipping: true } }),
    prisma.order.findMany({ where: { buyerId: portal.buyerId }, orderBy: [{ updatedAt: "desc" }], select: { id: true, nomor: true, tipe: true, status: true, tanggalOrder: true, deadline: true } }),
    prisma.sampleApproval.findMany({ where: { buyerId: portal.buyerId }, orderBy: [{ updatedAt: "desc" }] }),
    prisma.invoice.findMany({ where: { buyerId: portal.buyerId, status: { not: "VOID" } }, orderBy: [{ updatedAt: "desc" }], select: { id: true, nomor: true, orderId: true, currency: true, amount: true, dueDate: true, issuedAt: true, status: true } }),
    prisma.portalTicket.findMany({ where: { buyerId: portal.buyerId }, orderBy: [{ updatedAt: "desc" }] }),
  ]);
  if (!buyer) throw new DomainError("Buyer portal tidak ditemukan", 404, "portal_buyer_missing");
  const shipments = await prisma.shipment.findMany({
    where: { orderId: { in: orders.map((order) => order.id) } },
    orderBy: [{ updatedAt: "desc" }],
  });
  return { buyer, orders, sampleApprovals, invoices, shipments, tickets };
}

export async function createPortalTicket(input: AnyInput, portal: PortalActor) {
  const prisma = getPrisma();
  const orderId = textOrNull(input.orderId);
  if (orderId) {
    const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: portal.buyerId } });
    if (!order) throw new DomainError("Order tidak ditemukan untuk buyer portal ini", 404, "portal_order_not_found");
  }
  return prisma.portalTicket.create({
    data: {
      nomor: businessNumber("PT"),
      buyerId: portal.buyerId,
      orderId,
      subject: String(input.subject),
      message: textOrNull(input.message),
      status: "OPEN",
    } as never,
  });
}

export async function updatePortalTicketStatus(id: string, input: { status: string; version: number }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "PORTAL", "EDIT");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.portalTicket.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    const row = await tx.portalTicket.update({ where: { id }, data: { status: input.status as never, version: { increment: 1 } } });
    await catatAudit({ entitasType: "PortalTicket", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: input.status, actor, ipAddress }, tx);
    return row;
  });
}

export async function reportPortalPayment(input: AnyInput, portal: PortalActor) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: String(input.invoiceId), buyerId: portal.buyerId, status: { not: "VOID" } } as never });
    if (!invoice) throw new DomainError("Invoice tidak ditemukan untuk buyer portal ini", 404, "portal_invoice_not_found");
    return tx.payment.create({
      data: {
        nomor: businessNumber("PAY"),
        invoiceId: invoice.id,
        currency: invoice.currency,
        amount: Number(input.amount),
        reportedAt: new Date(),
        status: "REPORTED",
        reportedById: null,
        evidenceUrl: String(input.evidenceUrl),
        notes: textOrNull(input.notes),
      } as never,
    });
  });
}

export async function decidePortalSample(id: string, input: { status: string; version: number; notes?: unknown }, portal: PortalActor) {
  if (!["APPROVER", "VIEWER"].includes(portal.role)) throw new DomainError("Akun portal ini tidak boleh approve sample", 403, "portal_sample_role_denied");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.sampleApproval.findFirst({ where: { id, buyerId: portal.buyerId } as never });
    if (!current) throw new DomainError("Sample approval tidak ditemukan untuk buyer portal ini", 404, "portal_sample_not_found");
    assertOptimisticVersion(current.version, input.version);
    if (!["SENT", "REQUESTED"].includes(current.status)) throw new DomainError("Sample hanya bisa diputus saat REQUESTED/SENT", 409, "sample_status_locked");
    return tx.sampleApproval.update({
      where: { id },
      data: { status: input.status as never, decidedAt: new Date(), notes: textOrNull(input.notes) ?? current.notes, version: { increment: 1 } },
    });
  });
}

function textOrNull(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}
