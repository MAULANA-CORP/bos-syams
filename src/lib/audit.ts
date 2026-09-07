import type { Actor, AuditAction } from "@/lib/domain-types";
import { getPrisma } from "@/lib/prisma";

type AuditWriter = {
  auditTrail: {
    create: (args: { data: ReturnType<typeof buildAuditPayload> }) => Promise<unknown>;
  };
};

export type AuditInput = {
  entitasType: string;
  entitasId: string;
  aksi: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  actor: Actor;
  ipAddress?: string;
};

export function buildAuditPayload(input: AuditInput) {
  return {
    entitasType: input.entitasType,
    entitasId: input.entitasId,
    aksi: input.aksi,
    oldValue: input.oldValue === undefined ? undefined : JSON.parse(JSON.stringify(input.oldValue)),
    newValue: input.newValue === undefined ? undefined : JSON.parse(JSON.stringify(input.newValue)),
    reason: input.reason ?? null,
    actorId: input.actor.id,
    actorRole: input.actor.roles[0] ?? null,
    ipAddress: input.ipAddress ?? null,
  };
}

export async function catatAudit(input: AuditInput, tx: AuditWriter = getPrisma()) {
  return tx.auditTrail.create({ data: buildAuditPayload(input) });
}
