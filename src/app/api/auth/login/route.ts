import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";
import { catatAudit } from "@/lib/audit";
import { assertCsrf, fail, getClientIp, ok, readJson } from "@/lib/api-helpers";
import { checkLoginRateLimit, clearLoginRateLimit } from "@/lib/auth-rate-limit";
import { getSession } from "@/lib/session";
import { loginSchema } from "@/lib/schemas";
import { DomainError, type Actor } from "@/lib/domain-types";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const input = await readJson(req, loginSchema);
    const ip = getClientIp(req) ?? "unknown";
    const limited = await checkLoginRateLimit(`${ip}:${input.username.toLowerCase()}`);
    if (limited) throw new DomainError(`Terlalu banyak percobaan login. Coba lagi ${limited} detik.`, 429, "rate_limited");

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { username: input.username }, include: { roles: true } });
    const valid = user?.passwordHash ? await bcrypt.compare(input.password, user.passwordHash) : false;
    if (!user || !valid || !user.isActive) {
      if (user) {
        const actor: Actor = { id: user.id, nama: user.nama, username: user.username, roles: user.roles.map((r) => r.role as never), scopes: user.roles.map((r) => r.scope as never) };
        await catatAudit({ entitasType: "User", entitasId: user.id, aksi: "LOGIN_FAILED", actor, ipAddress: ip, reason: "username/password salah" }).catch(() => undefined);
      }
      throw new DomainError("Username atau password salah", 401, "invalid_credentials");
    }

    await clearLoginRateLimit(`${ip}:${input.username.toLowerCase()}`);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const actor: Actor = { id: user.id, nama: user.nama, username: user.username, roles: user.roles.map((r) => r.role as never), scopes: user.roles.map((r) => r.scope as never) };
    await catatAudit({ entitasType: "User", entitasId: user.id, aksi: "LOGIN", actor, ipAddress: ip });

    const session = await getSession();
    session.destroy();
    session.userId = user.id;
    session.nama = user.nama;
    session.isLoggedIn = true;
    await session.save();

    return ok({ id: user.id, nama: user.nama, username: user.username, mustChangePassword: user.mustChangePassword });
  } catch (error) {
    return fail(error);
  }
}
