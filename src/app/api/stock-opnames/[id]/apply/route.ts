import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { applyStockOpname } from "@/lib/phase4-service";
import { stockOpnameApplySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withPermission("INVENTORY", "EXECUTE", async ({ req, actor }, context) => {
  const input = await readJson(req, stockOpnameApplySchema);
  return ok(await applyStockOpname(await getId(context), input, actor, getClientIp(req)));
});
