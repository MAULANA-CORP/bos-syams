import { taskCreateSchema } from "@/lib/schemas";
import { createTask, listTasks } from "@/lib/task-service";
import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission("TASK", "VIEW", async () => ok(await listTasks()));

export const POST = withPermission("TASK", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, taskCreateSchema);
  return created(await createTask(input, actor, getClientIp(req)));
});
