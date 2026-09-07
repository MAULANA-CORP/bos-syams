import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { DomainError, type Actor, type ModuleCode, type PermissionAction } from "@/lib/domain-types";
import { getSession } from "@/lib/session";
import { getCurrentActor, assertPermission } from "@/lib/rbac";

export type AuthedContext = {
  req: NextRequest;
  actor: Actor;
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

  console.error(error);
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

export function getClientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? undefined;
}
