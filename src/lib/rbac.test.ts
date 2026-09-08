import { describe, expect, it } from "vitest";
import { type Actor, type UserRoleCode } from "@/lib/domain-types";
import { hasAnyRole, canSeeSensitiveGroup, maskSensitiveFields } from "@/lib/rbac";

function makeActor(roles: UserRoleCode[]): Actor {
  return {
    id: "test-user",
    nama: "Test User",
    username: "test",
    roles,
    scopes: ["ALL_COMPANY"],
  };
}

describe("hasAnyRole", () => {
  it("returns true when actor has one of the required roles", () => {
    const actor = makeActor(["CFO", "CEO"]);
    expect(hasAnyRole(actor, ["CFO"])).toBe(true);
  });

  it("returns true when actor has any of multiple required roles", () => {
    const actor = makeActor(["CMO_MANAGER"]);
    expect(hasAnyRole(actor, ["CFO", "CMO_MANAGER", "CEO"])).toBe(true);
  });

  it("returns false when actor has none of the required roles", () => {
    const actor = makeActor(["PRODUCTION_USER"]);
    expect(hasAnyRole(actor, ["CFO", "CEO"])).toBe(false);
  });

  it("returns false when actor has no roles", () => {
    const actor = makeActor([]);
    expect(hasAnyRole(actor, ["CFO"])).toBe(false);
  });
});

describe("canSeeSensitiveGroup", () => {
  it("allows CFO to see cost fields", () => {
    expect(canSeeSensitiveGroup(makeActor(["CFO"]), "cost")).toBe(true);
  });

  it("allows CEO to see cost fields", () => {
    expect(canSeeSensitiveGroup(makeActor(["CEO"]), "cost")).toBe(true);
  });

  it("blocks CMO from seeing cost fields", () => {
    expect(canSeeSensitiveGroup(makeActor(["CMO_MANAGER"]), "cost")).toBe(false);
  });

  it("allows CHRO to see salary fields", () => {
    expect(canSeeSensitiveGroup(makeActor(["CHRO"]), "salary")).toBe(true);
  });

  it("allows CEO to see salary fields", () => {
    expect(canSeeSensitiveGroup(makeActor(["CEO"]), "salary")).toBe(true);
  });

  it("blocks production from seeing salary fields", () => {
    expect(canSeeSensitiveGroup(makeActor(["PRODUCTION_CONTROLLER"]), "salary")).toBe(false);
  });

  it("allows CMO_MANAGER to see collection fields", () => {
    expect(canSeeSensitiveGroup(makeActor(["CMO_MANAGER"]), "collection")).toBe(true);
  });

  it("blocks warehouse from seeing collection fields", () => {
    expect(canSeeSensitiveGroup(makeActor(["WAREHOUSE_PURCHASING"]), "collection")).toBe(false);
  });
});

describe("maskSensitiveFields", () => {
  it("masks cost fields for non-cost roles", () => {
    const actor = makeActor(["CMO_MANAGER"]);
    const record = { nama: "Test", estimatedHpp: 100000, actualHpp: 95000, qty: 100 };
    const masked = maskSensitiveFields(actor, record);
    expect(masked.nama).toBe("Test");
    expect(masked.estimatedHpp).toBeNull();
    expect(masked.actualHpp).toBeNull();
    expect(masked.qty).toBe(100);
  });

  it("preserves cost fields for CFO", () => {
    const actor = makeActor(["CFO"]);
    const record = { nama: "Test", estimatedHpp: 100000, actualHpp: 95000 };
    const masked = maskSensitiveFields(actor, record);
    expect(masked.estimatedHpp).toBe(100000);
    expect(masked.actualHpp).toBe(95000);
  });

  it("masks salary for non-CHRO roles", () => {
    const actor = makeActor(["CMO_MANAGER"]);
    const record = { nama: "Test", salaryLevel: "L5" };
    const masked = maskSensitiveFields(actor, record);
    expect(masked.salaryLevel).toBeNull();
  });

  it("preserves salary for CHRO", () => {
    const actor = makeActor(["CHRO"]);
    const record = { nama: "Test", salaryLevel: "L5" };
    const masked = maskSensitiveFields(actor, record);
    expect(masked.salaryLevel).toBe("L5");
  });
});
