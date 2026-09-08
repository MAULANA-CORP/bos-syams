import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createSlaRule, listSlaRules } from "@/lib/sla-service";
import { slaRuleCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("SLA_RULE", "VIEW", async () => ok(await listSlaRules()));

export const POST = withPermission("SLA_RULE", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, slaRuleCreateSchema);
  return created(await createSlaRule(input, actor, getClientIp(req)));
});
