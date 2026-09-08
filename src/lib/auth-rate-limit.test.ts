import { describe, expect, it, beforeEach } from "vitest";
import { checkLoginRateLimitSync, clearLoginRateLimitSync } from "@/lib/auth-rate-limit";

/**
 * Tests use the sync (in-memory) fallback since we can't connect to
 * a real database in unit tests. The async PostgreSQL version is
 * tested via integration tests.
 */
describe("auth-rate-limit (sync fallback)", () => {
  beforeEach(() => {
    clearLoginRateLimitSync("test:admin");
  });

  it("allows first attempt", () => {
    const result = checkLoginRateLimitSync("test:admin");
    expect(result).toBeUndefined();
  });

  it("allows up to 5 attempts", () => {
    for (let i = 0; i < 4; i++) {
      checkLoginRateLimitSync("test:admin");
    }
    const result = checkLoginRateLimitSync("test:admin");
    expect(result).toBeUndefined();
  });

  it("blocks after 5 attempts", () => {
    for (let i = 0; i < 5; i++) {
      checkLoginRateLimitSync("test:admin");
    }
    const result = checkLoginRateLimitSync("test:admin");
    expect(result).toBeDefined();
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(60);
  });

  it("tracks different keys independently", () => {
    for (let i = 0; i < 5; i++) {
      checkLoginRateLimitSync("ip1:admin");
    }
    const blocked = checkLoginRateLimitSync("ip1:admin");
    expect(blocked).toBeDefined();

    const differentKey = checkLoginRateLimitSync("ip2:admin");
    expect(differentKey).toBeUndefined();
  });

  it("clears rate limit on successful login", () => {
    for (let i = 0; i < 5; i++) {
      checkLoginRateLimitSync("test:admin");
    }
    clearLoginRateLimitSync("test:admin");
    const result = checkLoginRateLimitSync("test:admin");
    expect(result).toBeUndefined();
  });
});
