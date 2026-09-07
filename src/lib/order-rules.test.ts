import { describe, expect, it } from "vitest";
import { DomainError, type Actor } from "@/lib/domain-types";
import { assertBusinessAuthority } from "@/lib/rbac";
import { buildAuditPayload } from "@/lib/audit";
import { assertOptimisticVersion, assertPriorityChangeAllowed, validateSizeBreakdown } from "@/lib/order-rules";

const systemAdmin: Actor = {
  id: "u-admin",
  nama: "System Admin",
  username: "admin",
  roles: ["SYSTEM_ADMIN"],
  scopes: ["SYSTEM"],
};

const cmo: Actor = {
  id: "u-cmo",
  nama: "CMO",
  username: "cmo",
  roles: ["CMO_MANAGER"],
  scopes: ["DEPARTMENT"],
};

describe("order rules", () => {
  it("menolak Size Breakdown yang totalnya tidak sama dengan qty Article", () => {
    expect(() => validateSizeBreakdown(10, [{ sizeId: "s", qty: 9 }])).toThrow(DomainError);
  });

  it("menerima Size Breakdown yang totalnya sama", () => {
    expect(validateSizeBreakdown(10, [{ sizeId: "s", qty: 10 }])).toEqual({ total: 10, diff: 0 });
  });

  it("mewajibkan reason saat priority diubah setelah SPK Release", () => {
    expect(() => assertPriorityChangeAllowed("SPK_RELEASED", "")).toThrow("wajib isi reason");
    expect(() => assertPriorityChangeAllowed("DRAFT", "")).not.toThrow();
  });

  it("menolak optimistic concurrency versi lama", () => {
    expect(() => assertOptimisticVersion(2, 1)).toThrow("Data sudah berubah");
  });
});

describe("security and audit rules", () => {
  it("menolak System Admin sebagai business authority", () => {
    expect(() => assertBusinessAuthority(systemAdmin, "ORDER", "EXECUTE")).toThrow("System Admin bukan business authority");
  });

  it("audit payload selalu membawa actor individual", () => {
    const payload = buildAuditPayload({
      entitasType: "Order",
      entitasId: "ord-1",
      aksi: "CREATE",
      actor: cmo,
      newValue: { status: "DRAFT" },
    });

    expect(payload.actorId).toBe("u-cmo");
    expect(payload.actorRole).toBe("CMO_MANAGER");
    expect(payload.newValue).toEqual({ status: "DRAFT" });
  });
});
