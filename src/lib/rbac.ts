import { getPrisma } from "@/lib/prisma";
import { DomainError, SENSITIVE_FIELD_GROUPS, type Actor, type ModuleCode, type PermissionAction, type UserRoleCode } from "@/lib/domain-types";

export async function getCurrentActor(userId: string): Promise<Actor> {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });

  if (!user || !user.isActive) {
    throw new DomainError("Akun tidak aktif atau tidak ditemukan", 401, "inactive_user");
  }

  return {
    id: user.id,
    nama: user.nama,
    username: user.username,
    roles: user.roles.map((r) => r.role as UserRoleCode),
    scopes: user.roles.map((r) => r.scope),
  };
}

export async function hasPermission(actor: Actor, modul: ModuleCode, aksi: PermissionAction) {
  if (actor.roles.length === 0) return false;
  const prisma = getPrisma();
  const count = await prisma.permission.count({
    where: {
      role: { in: actor.roles },
      modul,
      aksi,
      allowed: true,
    },
  });
  return count > 0;
}

export async function listAllowedPermissions(actor: Actor): Promise<Array<{ modul: ModuleCode; aksi: PermissionAction }>> {
  if (actor.roles.length === 0) return [];

  const prisma = getPrisma();
  const permissions = await prisma.permission.findMany({
    where: {
      role: { in: actor.roles },
      allowed: true,
    },
    select: {
      modul: true,
      aksi: true,
    },
    distinct: ["modul", "aksi"],
  });
  return permissions.map(({ modul, aksi }) => ({
    modul: modul as ModuleCode,
    aksi: aksi as PermissionAction,
  }));
}

export async function assertPermission(actor: Actor, modul: ModuleCode, aksi: PermissionAction) {
  const allowed = await hasPermission(actor, modul, aksi);
  if (!allowed) {
    throw new DomainError(
      `Tidak punya akses ${aksi} untuk modul ${modul}`,
      403,
      "permission_denied",
      { modul, aksi, roles: actor.roles },
    );
  }
}

export function canSeeSensitiveGroup(actor: Actor, group: keyof typeof SENSITIVE_FIELD_GROUPS) {
  if (group === "cost") return hasAnyRole(actor, ["CFO", "CEO"]);
  if (group === "salary") return hasAnyRole(actor, ["CHRO", "CEO", "CFO"]);
  if (group === "collection") return hasAnyRole(actor, ["CFO", "CMO_MANAGER", "CEO"]);
  return false;
}

export function maskSensitiveFields<T extends Record<string, unknown>>(actor: Actor, record: T): T {
  const next = { ...record };
  for (const [group, fields] of Object.entries(SENSITIVE_FIELD_GROUPS)) {
    if (canSeeSensitiveGroup(actor, group as keyof typeof SENSITIVE_FIELD_GROUPS)) continue;
    for (const field of fields) {
      if (field in next) next[field as keyof T] = null as T[keyof T];
    }
  }
  return next;
}

export function maskSensitiveList<T extends Record<string, unknown>>(actor: Actor, records: T[]) {
  return records.map((record) => maskSensitiveFields(actor, record));
}

export function hasAnyRole(actor: Actor, roles: UserRoleCode[]) {
  return actor.roles.some((role) => roles.includes(role));
}

export function assertBusinessAuthority(actor: Actor, modul: ModuleCode, aksi: PermissionAction) {
  const onlySystemAdmin = actor.roles.length > 0 && actor.roles.every((role) => role === "SYSTEM_ADMIN");
  if (onlySystemAdmin && ["BUYER", "ORDER", "ARTICLE", "BATCH", "EXCEPTION", "TASK"].includes(modul)) {
    throw new DomainError("System Admin bukan business authority", 403, "system_admin_not_business_authority");
  }
  return assertPermission(actor, modul, aksi);
}
