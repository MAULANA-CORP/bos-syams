import { describe, expect, it } from "vitest";
import { MODULES, type UserRoleCode } from "@/lib/domain-types";
import { getVisibleNavigationItems, type PermissionSummary } from "@/lib/navigation";

const allViewPermissions: PermissionSummary[] = MODULES.map((modul) => ({ modul, aksi: "VIEW" }));

function menuLabelsFor(roles: UserRoleCode[]) {
  return getVisibleNavigationItems({ roles, permissions: allViewPermissions }).map((item) => item.label);
}

describe("role navigation", () => {
  it("membatasi menu QC ke area quality saja", () => {
    const labels = menuLabelsFor(["QC"]);

    expect(labels).toEqual(["TODAY", "Panduan", "Produksi", "Sample", "Task", "Exception"]);
    expect(labels).not.toContain("Buyer");
    expect(labels).not.toContain("Order");
    expect(labels).not.toContain("Batch");
    expect(labels).not.toContain("Master Data");
  });

  it("membatasi System Admin dari menu transaksi bisnis", () => {
    const labels = menuLabelsFor(["SYSTEM_ADMIN"]);

    expect(labels).toEqual(["TODAY", "Panduan", "Master Data", "Admin"]);
    expect(labels).not.toContain("Order");
    expect(labels).not.toContain("Finance");
    expect(labels).not.toContain("CEO Tower");
  });

  it("membuat Owner fokus ke kontrol, bukan input harian semua divisi", () => {
    const labels = menuLabelsFor(["CEO"]);

    expect(labels).toEqual(["TODAY", "Panduan", "CEO Tower", "Request Revision", "Change Request", "SLA & Delegation", "Task", "Exception"]);
    expect(labels).not.toContain("Buyer");
    expect(labels).not.toContain("Inventory");
    expect(labels).not.toContain("Admin");
  });

  it("menggabungkan menu hanya dari role yang dimiliki user multi-role", () => {
    const labels = menuLabelsFor(["CMO_MANAGER", "WAREHOUSE_PURCHASING"]);

    expect(labels).toContain("Buyer");
    expect(labels).toContain("Inventory");
    expect(labels).toContain("Shipment");
    expect(labels).toContain("Makloon");
    expect(labels).not.toContain("Finance");
    expect(labels).not.toContain("People");
    expect(labels).not.toContain("Admin");
  });
});
