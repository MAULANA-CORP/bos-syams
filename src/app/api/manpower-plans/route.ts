import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createManpowerPlan, listManpowerPlans } from "@/lib/phase7-service";
import { manpowerPlanCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("MANPOWER", "VIEW", async () => ok(await listManpowerPlans()));

export const POST = withPermission("MANPOWER", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, manpowerPlanCreateSchema);
  return created(await createManpowerPlan(input, actor, getClientIp(req)));
});
