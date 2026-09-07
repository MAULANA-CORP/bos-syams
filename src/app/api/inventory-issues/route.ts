import { created, getClientIp, readJson, withPermission } from "@/lib/api-helpers";
import { issueInventory } from "@/lib/phase4-service";
import { inventoryIssueSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const POST = withPermission("INVENTORY", "EXECUTE", async ({ req, actor }) => {
  const input = await readJson(req, inventoryIssueSchema);
  return created(await issueInventory(input, actor, getClientIp(req)));
});
