import { catatAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/lib/domain-types";
import { businessNumber } from "@/lib/numbering";
import { assertOptimisticVersion } from "@/lib/order-rules";
import { getPrisma } from "@/lib/prisma";
import { assertBusinessAuthority } from "@/lib/rbac";

type RevisionInput = {
  judul: string;
  modul: string;
  deskripsi: string;
  prioritas?: string;
  checklist: string[];
  imageData?: string | null;
  imageName?: unknown;
  imageMime?: string | null;
};

type RevisionUpdateInput = {
  status?: "OPEN" | "DONE";
  version: number;
  checklist?: { id: string; isDone: boolean }[];
  reason?: string;
};

export async function listRevisionRequests(status?: "OPEN" | "DONE") {
  return getPrisma().revisionRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      requestedBy: { select: { id: true, nama: true, username: true, roles: { select: { role: true } } } },
      checklist: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function createRevisionRequest(input: RevisionInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "REVISION", "CREATE");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const row = await tx.revisionRequest.create({
      data: {
        nomor: businessNumber("REV"),
        judul: input.judul,
        modul: input.modul,
        deskripsi: input.deskripsi,
        prioritas: input.prioritas ?? "MEDIUM",
        imageData: input.imageData ?? null,
        imageName: textOrNull(input.imageName),
        imageMime: input.imageMime ?? null,
        requestedById: actor.id,
        checklist: {
          create: input.checklist.map((label, sortOrder) => ({ label, sortOrder })),
        },
      },
      include: { checklist: { orderBy: { sortOrder: "asc" } } },
    });
    await catatAudit({ entitasType: "RevisionRequest", entitasId: row.id, aksi: "CREATE", newValue: row, actor, ipAddress }, tx);
    return row;
  });
}

function textOrNull(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function updateRevisionRequest(id: string, input: RevisionUpdateInput, actor: Actor, ipAddress?: string) {
  await assertBusinessAuthority(actor, "REVISION", "EDIT");
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.revisionRequest.findUniqueOrThrow({ where: { id }, include: { checklist: true } });
    assertOptimisticVersion(current.version, input.version);

    const checklist = input.checklist ?? current.checklist.map((item) => ({ id: item.id, isDone: item.isDone }));
    const checklistById = new Map(current.checklist.map((item) => [item.id, item]));
    if (checklist.some((item) => !checklistById.has(item.id))) {
      throw new DomainError("Checklist request revision tidak valid", 422, "revision_checklist_invalid");
    }
    const nextStatus = input.status ?? current.status;
    if (nextStatus === "DONE" && checklist.some((item) => !item.isDone)) {
      throw new DomainError("Semua checklist harus selesai sebelum request ditandai Done", 422, "revision_checklist_incomplete");
    }

    for (const item of checklist) {
      await tx.revisionChecklist.update({ where: { id: item.id }, data: { isDone: item.isDone } });
    }
    const row = await tx.revisionRequest.update({
      where: { id },
      data: { status: nextStatus, version: { increment: 1 } },
      include: { checklist: { orderBy: { sortOrder: "asc" } } },
    });
    await catatAudit({ entitasType: "RevisionRequest", entitasId: id, aksi: "UPDATE", oldValue: current, newValue: row, reason: input.reason ?? nextStatus, actor, ipAddress }, tx);
    return row;
  });
}
