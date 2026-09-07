import { DomainError, type Actor } from "@/lib/domain-types";
import { hasAnyRole } from "@/lib/rbac";

export type SizeLine = { sizeId: string; qty: number };

export function validateSizeBreakdown(articleQty: number, sizes: SizeLine[]) {
  if (!Number.isInteger(articleQty) || articleQty <= 0) {
    throw new DomainError("Qty Article harus lebih dari 0", 422, "invalid_article_qty");
  }
  if (sizes.length === 0) {
    throw new DomainError("Size Breakdown wajib diisi", 422, "size_breakdown_required");
  }

  const seen = new Set<string>();
  let total = 0;
  for (const line of sizes) {
    if (!line.sizeId) throw new DomainError("Size wajib dipilih", 422, "size_required");
    if (seen.has(line.sizeId)) throw new DomainError("Size tidak boleh dobel", 422, "duplicate_size");
    if (!Number.isInteger(line.qty) || line.qty < 0) {
      throw new DomainError("Qty per size harus angka bulat minimal 0", 422, "invalid_size_qty");
    }
    seen.add(line.sizeId);
    total += line.qty;
  }

  if (total !== articleQty) {
    throw new DomainError(
      `Total Size Breakdown ${total} tidak sama dengan qty Article ${articleQty}. Selisih ${total - articleQty}.`,
      422,
      "size_breakdown_mismatch",
      { articleQty, total, diff: total - articleQty },
    );
  }
  return { total, diff: 0 };
}

export function assertBuyerCanReceiveOrder(status: string) {
  if (status === "BLACKLIST") {
    throw new DomainError("Buyer BLACKLIST tidak boleh dibuatkan Order baru", 409, "buyer_blacklisted");
  }
}

export function assertPriorityChangeAllowed(orderStatus: string, reason?: string | null) {
  if (orderStatus === "SPK_RELEASED" && !reason?.trim()) {
    throw new DomainError("Ubah Business Priority setelah SPK Release wajib isi reason", 422, "reason_required");
  }
}

export function assertOptimisticVersion(currentVersion: number, expectedVersion: number) {
  if (currentVersion !== expectedVersion) {
    throw new DomainError("Data sudah berubah. Muat ulang sebelum menyimpan lagi.", 409, "stale_version", {
      currentVersion,
      expectedVersion,
    });
  }
}

export function assertCanReleaseSpk(actor: Actor, status: string) {
  if (!hasAnyRole(actor, ["CMO_MANAGER"])) {
    throw new DomainError("SPK Release hanya boleh dilakukan CMO Manager", 403, "spk_release_forbidden");
  }
  if (status !== "CONFIRMED") {
    throw new DomainError("Order harus CONFIRMED sebelum SPK Release", 409, "order_not_confirmed");
  }
}

export function assertCanReleaseBatch(actor: Actor, status: string) {
  if (!hasAnyRole(actor, ["PRODUCTION_CONTROLLER"])) {
    throw new DomainError("Batch Release hanya boleh dilakukan Production Controller", 403, "batch_release_forbidden");
  }
  if (status !== "PLANNED") {
    throw new DomainError("Hanya batch PLANNED yang bisa di-release", 409, "batch_not_planned");
  }
}
