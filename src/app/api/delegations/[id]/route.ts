import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { updateDelegation } from "@/lib/delegation-service";
import { z } from "zod";

export const dynamic = "force-dynamic";
const updateSchema = z.object({ version: z.number().int().min(0), isActive: z.boolean(), reason: z.string().trim().min(1) });

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const PATCH = withPermission("DELEGATION", "EDIT", async ({ req, actor }, context) => ok(await updateDelegation(await getId(context), await readJson(req, updateSchema), actor, getClientIp(req))));
