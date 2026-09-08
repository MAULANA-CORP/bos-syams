import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { updateSlaRule } from "@/lib/sla-service";
import { slaRuleUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  return (await (context as { params: Promise<{ id: string }> }).params).id;
}

export const PATCH = withPermission("SLA_RULE", "EDIT", async ({ req, actor }, context) => {
  const input = await readJson(req, slaRuleUpdateSchema);
  return ok(await updateSlaRule(await getId(context), input, actor, getClientIp(req)));
});
