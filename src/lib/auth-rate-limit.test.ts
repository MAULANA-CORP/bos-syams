import { describe, expect, it, beforeEach } from "vitest";
import { checkLoginRateLimit, clearLoginRateLimit } from "@/lib/auth-rate-limit";

describe("auth-rate-limit", () => {
  beforeEach(() => {
    // Clean up any existing state
    clearLoginRateLimit("test:admin");
  });

  it("allows first attempt", () => {
    const result = checkLoginRateLimit("test:admin");
    expect(result).toBeUndefined();
  });

  it("allows up to 5 attempts", () => {
    for (let i = 0; i < 4; i++) {
      checkLoginRateLimit("test:admin");
    }
    const result = checkLoginRateLimit("test:admin");
    expect(result).toBeUndefined();
  });

  it("blocks after 5 attempts", () => {
    for (let i = 0; i < 5; i++) {
      checkLoginRateLimit("test:admin");
    }
    const result = checkLoginRateLimit("test:admin");
    expect(result).toBeDefined();
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(60);
  });

  it("tracks different keys independently", () => {
    for (let i = 0; i < 5; i++) {
      checkLoginRateLimit("ip1:admin");
    }
    const blocked = checkLoginRateLimit("ip1:admin");
    expect(blocked).toBeDefined();

    const differentKey = checkLoginRateLimit("ip2:admin");
    expect(differentKey).toBeUndefined();
  });

  it("clears rate limit on successful login", () => {
    for (let i = 0; i < 5; i++) {
      checkLoginRateLimit("test:admin");
    }
    clearLoginRateLimit("test:admin");
    const result = checkLoginRateLimit("test:admin");
    expect(result).toBeUndefined();
  });
});
