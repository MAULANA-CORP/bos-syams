import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { decideStockOpname } from "@/lib/phase4-service";
import { stockOpnameDecisionSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withPermission("INVENTORY", "APPROVE", async ({ req, actor }, context) => {
  const input = await readJson(req, stockOpnameDecisionSchema);
  return ok(await decideStockOpname(await getId(context), input, actor, getClientIp(req)));
});
