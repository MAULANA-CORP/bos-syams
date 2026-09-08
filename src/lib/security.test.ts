import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { assertCsrf } from "@/lib/api-helpers";
import { checkRequestRateLimit } from "@/lib/request-rate-limit";
import { proxy } from "@/proxy";

describe("request security", () => {
  it("redirects an HTML request without a session cookie", () => {
    const response = proxy(new NextRequest("http://localhost:3000/pricing"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("requires a matching CSRF cookie and header for mutations", () => {
    const valid = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { cookie: "bos_syams_csrf=csrf-token-12345678901234567890", "x-csrf-token": "csrf-token-12345678901234567890" },
    });
    expect(() => assertCsrf(valid)).not.toThrow();

    const invalid = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { cookie: "bos_syams_csrf=csrf-token-12345678901234567890", "x-csrf-token": "wrong-token" },
    });
    expect(() => assertCsrf(invalid)).toThrow("CSRF token tidak valid");
  });

  it("limits repeated mutation requests per key", () => {
    const key = `security-test-${Date.now()}`;
    expect(checkRequestRateLimit(key, 2)).toBeUndefined();
    expect(checkRequestRateLimit(key, 2)).toBeUndefined();
    expect(checkRequestRateLimit(key, 2)).toBeTypeOf("number");
  });
});
