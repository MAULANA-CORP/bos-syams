import { getPrisma } from "@/lib/prisma";
import { catatAudit } from "@/lib/audit";
import { assertBusinessAuthority } from "@/lib/rbac";
import { assertOptimisticVersion } from "@/lib/order-rules";
import { toDate } from "@/lib/date";
import { completeSlaForTask, createSlaInstanceForTask } from "@/lib/sla-service";
import type { Actor } from "@/lib/domain-types";

export async function listTasks() {
  return getPrisma().task.findMany({
    orderBy: [{ status: "asc" }, { due: "asc" }],
    include: { assignee: { select: { id: true, nama: true } } },
  });
}

export async function createTask(input: Record<string, unknown>, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "TASK", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const { slaRuleId, ...taskInput } = input;
    const task = await tx.task.create({ data: { ...taskInput, due: toDate(input.due as string | null | undefined) } as never });
    if (slaRuleId) await createSlaInstanceForTask(tx, task, String(slaRuleId));
    await catatAudit({ entitasType: "Task", entitasId: task.id, aksi: "CREATE", newValue: task, actor, ipAddress }, tx);
    return task;
  });
}

export async function updateTask(id: string, input: Record<string, unknown>, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "TASK", "EDIT");
  const { version, reason, ...data } = input;
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.task.findUniqueOrThrow({ where: { id } });
    assertOptimisticVersion(current.version, Number(version));
    const status = data.status ?? current.status;
    const task = await tx.task.update({
      where: { id },
      data: {
        ...(data as object),
        due: "due" in data ? toDate(data.due as string | null | undefined) : current.due,
        closedAt: status === "DONE" || status === "CANCELLED" ? new Date() : null,
        version: { increment: 1 },
      } as never,
    });
    if (status === "DONE" || status === "CANCELLED") await completeSlaForTask(tx, id);
    await catatAudit({ entitasType: "Task", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: task, reason: String(reason), actor, ipAddress }, tx);
    return task;
  });
}
