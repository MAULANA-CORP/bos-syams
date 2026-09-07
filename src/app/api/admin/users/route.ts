import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { catatAudit } from "@/lib/audit";
import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const userCreateSchema = z.object({
  nama: z.string().trim().min(1),
  username: z.string().trim().min(1),
  password: z.string().min(6),
  email: z.string().email().optional().nullable(),
  departemen: z.string().optional().nullable(),
  roles: z.array(z.object({ role: z.string(), scope: z.string() })).min(1),
});

export const GET = withPermission("USER", "VIEW", async () => {
  const users = await getPrisma().user.findMany({
    orderBy: { nama: "asc" },
    include: { roles: true },
  });
  return ok(users.map(({ passwordHash: _passwordHash, pinHash: _pinHash, ...user }) => user));
});

export const POST = withPermission("USER", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, userCreateSchema);
  const prisma = getPrisma();
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        nama: input.nama,
        username: input.username,
        email: input.email,
        departemen: input.departemen,
        passwordHash: await bcrypt.hash(input.password, 10),
        roles: { create: input.roles as never },
      },
      include: { roles: true },
    });
    await catatAudit({ entitasType: "User", entitasId: createdUser.id, aksi: "CREATE", newValue: { ...createdUser, passwordHash: "[redacted]" }, actor, ipAddress: getClientIp(req) }, tx);
    return createdUser;
  });
  const { passwordHash: _passwordHash, pinHash: _pinHash, ...safe } = user;
  return created(safe);
});
