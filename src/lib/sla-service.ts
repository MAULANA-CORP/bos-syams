import { catatAudit } from "@/lib/audit";
import { toDate } from "@/lib/date";
import { assertOptimisticVersion } from "@/lib/order-rules";
import { DomainError, type Actor } from "@/lib/domain-types";
import { getPrisma } from "@/lib/prisma";
import { assertBusinessAuthority } from "@/lib/rbac";

type RuleInput = Record<string, unknown>;

export async function listSlaRules() {
  return getPrisma().slaRule.findMany({ orderBy: [{ active: "desc" }, { process: "asc" }, { nama: "asc" }] });
}

export async function createSlaRule(input: RuleInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "SLA_RULE", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const row = await tx.slaRule.create({ data: ruleData(input) as never });
    await catatAudit({ entitasType: "SlaRule", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

export async function updateSlaRule(id: string, input: RuleInput & { version: number }, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "SLA_RULE", "EDIT");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.slaRule.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, input.version);
    const row = await tx.slaRule.update({ where: { id }, data: { ...ruleData(input, true), version: { increment: 1 } } as never });
    await catatAudit({ entitasType: "SlaRule", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: String(input.reason ?? "Update SLA rule"), actor, ipAddress }, tx);
    return row;
  });
}

export async function listSlaInstances() {
  const rows = await getPrisma().slaInstance.findMany({
    orderBy: [{ dueAt: "asc" }],
    include: { rule: true, owner: { select: { id: true, nama: true } }, task: { select: { id: true, judul: true, status: true } } },
  });
  return rows.map((row) => ({ ...row, status: row.completedAt ? "COMPLETED" : deriveStatus(row.slaStart, row.dueAt, row.rule.warningThreshold) }));
}

export async function createSlaInstanceForTask(tx: any, task: { id: string; assigneeId?: string | null }, ruleId: string, start = new Date()) {
  const rule = await tx.slaRule.findUnique({ where: { id: ruleId, active: true } });
  if (!rule) throw new DomainError("SLA rule tidak ditemukan atau tidak aktif", 422, "sla_rule_not_active");
  const dueAt = new Date(start.getTime() + rule.targetMinutes * 60_000);
  return tx.slaInstance.create({
    data: {
      ruleId: rule.id,
      ruleVersion: rule.version,
      sourceEntitas: "Task",
      sourceId: task.id,
      taskId: task.id,
      ownerId: task.assigneeId ?? null,
      slaStart: start,
      dueAt,
      status: "ON_TRACK",
    },
  });
}

export async function completeSlaForTask(tx: any, taskId: string, completedAt = new Date()) {
  const current = await tx.slaInstance.findUnique({ where: { taskId } });
  if (!current || current.completedAt) return;
  await tx.slaInstance.update({
    where: { id: current.id },
    data: { completedAt, elapsedMinutes: Math.max(0, Math.round((completedAt.getTime() - current.slaStart.getTime()) / 60_000)), status: "COMPLETED" },
  });
}

function ruleData(input: RuleInput, partial = false) {
  const data: Record<string, unknown> = {};
  if (!partial || input.kode !== undefined) data.kode = String(input.kode);
  if (!partial || input.nama !== undefined) data.nama = String(input.nama);
  if (!partial || input.process !== undefined) data.process = String(input.process);
  if (!partial || input.orderType !== undefined) data.orderType = textOrNull(input.orderType);
  if (!partial || input.targetMinutes !== undefined) data.targetMinutes = Number(input.targetMinutes);
  if (!partial || input.startTrigger !== undefined) data.startTrigger = String(input.startTrigger);
  if (!partial || input.stopTrigger !== undefined) data.stopTrigger = String(input.stopTrigger);
  if (!partial || input.warningThreshold !== undefined) data.warningThreshold = Number(input.warningThreshold ?? 80);
  if (!partial || input.escalationRule !== undefined) data.escalationRule = textOrNull(input.escalationRule);
  if (!partial || input.ownerRole !== undefined) data.ownerRole = textOrNull(input.ownerRole);
  if (!partial || input.workingCalendar !== undefined) data.workingCalendar = String(input.workingCalendar ?? "BUSINESS");
  if (!partial || input.active !== undefined) data.active = input.active === undefined ? true : Boolean(input.active);
  if (!partial || input.effectiveFrom !== undefined) data.effectiveFrom = toDate(input.effectiveFrom as string | null | undefined);
  if (!partial || input.effectiveTo !== undefined) data.effectiveTo = toDate(input.effectiveTo as string | null | undefined);
  return data;
}

function deriveStatus(start: Date, dueAt: Date, warningThreshold: number) {
  const now = Date.now();
  if (now >= dueAt.getTime()) return "OVERDUE" as const;
  const total = dueAt.getTime() - start.getTime();
  const elapsed = now - start.getTime();
  return elapsed / total * 100 >= warningThreshold ? "WARNING" as const : "ON_TRACK" as const;
}

function textOrNull(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}
