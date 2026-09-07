import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { taskUpdateSchema } from "@/lib/schemas";
import { updateTask } from "@/lib/task-service";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const PATCH = withPermission("TASK", "EDIT", async ({ req, actor }, context) => {
  const id = await getId(context);
  const input = await readJson(req, taskUpdateSchema);
  return ok(await updateTask(id, input, actor, getClientIp(req)));
});
