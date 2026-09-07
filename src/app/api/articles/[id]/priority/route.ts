import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { priorityUpdateSchema } from "@/lib/schemas";
import { updateArticlePriority } from "@/lib/order-service";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const PATCH = withPermission("ARTICLE", "EDIT", async ({ req, actor }, context) => {
  const id = await getId(context);
  const input = await readJson(req, priorityUpdateSchema);
  return ok(await updateArticlePriority(id, input, actor, getClientIp(req)));
});
