import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { DomainError, type Actor, type ModuleCode, type PermissionAction } from "@/lib/domain-types";
import { getSession } from "@/lib/session";
import { getCurrentActor, assertPermission } from "@/lib/rbac";
import { getPrisma } from "@/lib/prisma";
import { checkRequestRateLimit } from "@/lib/request-rate-limit";

export type AuthedContext = {
  req: NextRequest;
  actor: Actor;
};

export type PortalContext = {
  req: NextRequest;
  portal: {
    id: string;
    buyerId: string;
    email: string;
    role: string;
  };
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function fail(error: unknown) {
  if (
    error instanceof DomainError ||
    (error &&
      typeof error === "object" &&
      "status" in error &&
      "code" in error &&
      typeof (error as { status?: unknown }).status === "number")
  ) {
    const domainError = error as DomainError;
    return NextResponse.json(
      { error: domainError.message, type: domainError.code, details: domainError.details ?? null },
      { status: domainError.status },
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Input tidak valid", type: "validation_error", details: error.flatten() },
      { status: 422 },
    );
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "ECONNREFUSED"
  ) {
    return NextResponse.json(
      { error: "Database tidak bisa dihubungi. Pastikan PostgreSQL sudah jalan dan DATABASE_URL benar.", type: "database_unreachable" },
      { status: 503 },
    );
  }

  if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2022") {
    return NextResponse.json(
      { error: "Database belum memakai migration terbaru. Deploy ulang image atau jalankan prisma migrate deploy.", type: "database_schema_outdated" },
      { status: 503 },
    );
  }

  console.error("[api] unhandled request error", error instanceof Error ? error.name : typeof error);
  return NextResponse.json(
    { error: "Terjadi kesalahan server", type: "server_error" },
    { status: 500 },
  );
}

export async function readJson<T>(req: NextRequest, schema: z.ZodType<T>): Promise<T> {
  const json = await req.json().catch(() => ({}));
  return schema.parse(json);
}

export function withAuth(
  handler: (ctx: AuthedContext, context?: unknown) => Promise<Response>,
) {
  return async (req: NextRequest, context?: unknown) => {
    try {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        const limited = checkRequestRateLimit(`${getClientIp(req) ?? "unknown"}:${req.nextUrl.pathname}`);
        if (limited) throw new DomainError(`Terlalu banyak request. Coba lagi ${limited} detik.`, 429, "rate_limited");
        assertCsrf(req);
      }
      const session = await getSession();
      if (!session.isLoggedIn || !session.userId) {
        throw new DomainError("Belum login", 401, "auth_required");
      }
      const actor = await getCurrentActor(session.userId);
      return await handler({ req, actor }, context);
    } catch (error) {
      return fail(error);
    }
  };
}

export function withPermission(
  modul: ModuleCode,
  aksi: PermissionAction,
  handler: (ctx: AuthedContext, context?: unknown) => Promise<Response>,
) {
  return withAuth(async (ctx, context) => {
    await assertPermission(ctx.actor, modul, aksi);
    return handler(ctx, context);
  });
}

export function withPortalAuth(
  handler: (ctx: PortalContext, context?: unknown) => Promise<Response>,
) {
  return async (req: NextRequest, context?: unknown) => {
    try {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        const limited = checkRequestRateLimit(`${getClientIp(req) ?? "unknown"}:${req.nextUrl.pathname}`);
        if (limited) throw new DomainError(`Terlalu banyak request. Coba lagi ${limited} detik.`, 429, "rate_limited");
        assertCsrf(req);
      }
      const session = await getSession();
      if (!session.isPortalLoggedIn || !session.portalAccountId || !session.portalBuyerId) {
        throw new DomainError("Portal belum login", 401, "portal_auth_required");
      }
      const account = await getPrisma().portalAccount.findUnique({ where: { id: session.portalAccountId } });
      if (!account || !account.isActive || account.buyerId !== session.portalBuyerId) {
        throw new DomainError("Akun portal tidak aktif atau session tidak valid", 401, "portal_session_invalid");
      }
      return await handler({
        req,
        portal: {
          id: account.id,
          buyerId: account.buyerId,
          email: account.email,
          role: account.portalRole,
        },
      }, context);
    } catch (error) {
      return fail(error);
    }
  };
}

export function assertCsrf(req: NextRequest) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return;
  const cookieToken = req.cookies.get("bos_syams_csrf")?.value;
  const headerToken = req.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken.length < 20 || cookieToken !== headerToken) {
    throw new DomainError("CSRF token tidak valid", 403, "csrf_invalid");
  }
  const origin = req.headers.get("origin");
  if (origin) {
    if (!getAllowedOrigins(req).has(origin)) throw new DomainError("Origin request tidak diizinkan", 403, "origin_invalid");
  }
}

function getAllowedOrigins(req: NextRequest) {
  const allowed = new Set<string>([req.nextUrl.origin]);
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || req.headers.get("host") || req.nextUrl.host;
  if (host) allowed.add(`${proto}://${host}`);
  if (process.env.APP_BASE_URL) {
    try { allowed.add(new URL(process.env.APP_BASE_URL).origin); } catch { /* invalid deployment config is ignored here */ }
  }
  return allowed;
}

export function getClientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? undefined;
}
