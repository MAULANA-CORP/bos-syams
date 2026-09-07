import { catatAudit } from "@/lib/audit";
import { businessNumber } from "@/lib/numbering";
import { DomainError, type Actor } from "@/lib/domain-types";
import { getPrisma } from "@/lib/prisma";
import { assertBusinessAuthority, hasAnyRole, maskSensitiveList } from "@/lib/rbac";
import { assertOptimisticVersion } from "@/lib/order-rules";
import { toDate } from "@/lib/date";

type AnyInput = Record<string, unknown>;

export async function getPricingConfig(actor: Actor) {
  await assertBusinessAuthority(actor, "QUOTATION", "VIEW");
  const pricing = await readPricingConfig(getPrisma() as never);
  return {
    markupMode: pricing.mode,
    markupPercent: pricing.markupPercent,
    isComplete: pricing.mode !== null && pricing.markupPercent !== null,
  };
}

export async function updatePricingConfig(input: { markupMode: string; markupPercent: number }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "QUOTATION", "APPROVE");
  if (!hasAnyRole(actor, ["CFO", "CEO"])) {
    throw new DomainError("Hanya CFO/CEO yang boleh mengunci pricing config", 403, "pricing_config_denied");
  }
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const before = await readPricingConfig(tx);
    await tx.systemConfig.update({ where: { key: "PRICING_MARKUP_MODE" }, data: { value: input.markupMode } });
    await tx.systemConfig.update({ where: { key: "PRICING_MARKUP_PERCENT" }, data: { value: String(input.markupPercent) } });
    const after = { mode: input.markupMode, markupPercent: input.markupPercent };
    await catatAudit({
      entitasType: "SystemConfig",
      entitasId: "PRICING",
      aksi: "UPDATE",
      oldValue: before,
      newValue: after,
      reason: "Kunci pricing config Fase 2",
      actor,
      ipAddress,
    }, tx);
    return { markupMode: after.mode, markupPercent: after.markupPercent, isComplete: true };
  });
}

export async function listQuotations(actor: Actor) {
  const rows = await getPrisma().quotation.findMany({ orderBy: [{ updatedAt: "desc" }] });
  return maskSensitiveList(actor, rows as unknown as Record<string, unknown>[]);
}

export async function createQuotation(input: AnyInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "QUOTATION", "CREATE");
  assertCostAccess(input, actor);

  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const pricing = await readPricingConfig(tx);
    const estimatedHpp = money(input.estimatedHpp);
    const markupPercent = money(input.markupPercent) ?? pricing.markupPercent;
    const minimumPrice = calculateMinimumPrice(estimatedHpp, markupPercent, pricing.mode);
    const notes = [input.notes, minimumPrice === null ? "Pricing config/HPP belum lengkap; quotation hanya bisa draft." : null]
      .filter(Boolean)
      .join(" ");

    const quotation = await tx.quotation.create({
      data: {
        buyerId: textOrNull(input.buyerId),
        orderId: textOrNull(input.orderId),
        articleId: textOrNull(input.articleId),
        currency: String(input.currency ?? "IDR"),
        estimatedHpp,
        markupPercent,
        minimumPrice,
        offeredPrice: money(input.offeredPrice),
        baseOfferedPrice: money(input.baseOfferedPrice),
        validUntil: toDate(input.validUntil as string | null | undefined),
        notes: notes || null,
        nomor: businessNumber("QUO"),
        status: "DRAFT",
      } as never,
    });
    await catatAudit({ entitasType: "Quotation", entitasId: quotation.id, aksi: "CREATE", newValue: quotation, actor, ipAddress }, tx);
    return quotation;
  });
}

export async function updateQuotationStatus(id: string, input: { status: string; version: number; reason?: string }, actor: Actor, ipAddress?: string) {
  const action = input.status === "SENT" ? "EXECUTE" : "APPROVE";
  await assertBusinessAuthority(actor, "QUOTATION", action);

  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.quotation.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);

    if (input.status === "SENT" || input.status === "APPROVED") {
      if (current.offeredPrice === null) throw new DomainError("Offered price wajib diisi sebelum quotation dikirim", 409, "quotation_missing_price");
      if (current.minimumPrice === null) throw new DomainError("Minimum price belum bisa dihitung. Isi pricing config/HPP dulu.", 409, "pricing_config_incomplete");
      if (Number(current.offeredPrice) < Number(current.minimumPrice)) {
        const approvedException = await tx.exceptionCase.count({
          where: {
            tipe: "PRICE_BELOW_MINIMUM",
            status: "APPROVED",
            sourceModul: "QUOTATION",
            referensiId: id,
          },
        });
        if (approvedException === 0) {
          throw new DomainError("Offered price di bawah minimum price. Buat exception PRICE_BELOW_MINIMUM untuk approval CFO/CEO.", 409, "price_below_minimum");
        }
      }
    }

    if (input.status === "APPROVED" && !hasAnyRole(actor, ["CFO", "CEO"])) {
      throw new DomainError("Hanya CFO/CEO yang boleh approve quotation", 403, "quotation_approval_denied");
    }

    const quotation = await tx.quotation.update({
      where: { id },
      data: {
        status: input.status as never,
        approvedByRole: input.status === "APPROVED" ? actor.roles[0] : current.approvedByRole,
        version: { increment: 1 },
      },
    });
    await catatAudit({ entitasType: "Quotation", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: quotation, reason: input.reason ?? input.status, actor, ipAddress }, tx);
    return quotation;
  });
}

function assertCostAccess(input: AnyInput, actor: Actor) {
  const sendsCost = input.estimatedHpp !== null && input.estimatedHpp !== undefined || input.markupPercent !== null && input.markupPercent !== undefined;
  if (sendsCost && !hasAnyRole(actor, ["CFO", "CEO"])) {
    throw new DomainError("Estimated HPP dan markup hanya boleh diisi CFO/CEO", 403, "cost_field_denied");
  }
}

async function readPricingConfig(tx: { systemConfig: { findMany: (args: never) => Promise<{ key: string; value: string | null }[]> } }) {
  const rows = await tx.systemConfig.findMany({ where: { key: { in: ["PRICING_MARKUP_MODE", "PRICING_MARKUP_PERCENT"] } } } as never);
  const mode = rows.find((row) => row.key === "PRICING_MARKUP_MODE")?.value ?? null;
  const percent = rows.find((row) => row.key === "PRICING_MARKUP_PERCENT")?.value ?? null;
  return { mode, markupPercent: percent === null ? null : Number(percent) };
}

function calculateMinimumPrice(estimatedHpp: number | null, markupPercent: number | null, mode: string | null) {
  if (estimatedHpp === null || markupPercent === null || mode === null) return null;
  if (mode === "MARKUP_ON_COST") return roundMoney(estimatedHpp * (1 + markupPercent / 100));
  if (mode === "MARGIN_ON_PRICE") return roundMoney(estimatedHpp / (1 - markupPercent / 100));
  return null;
}

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return roundMoney(Number(value));
}

function roundMoney(value: number) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function textOrNull(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
}
