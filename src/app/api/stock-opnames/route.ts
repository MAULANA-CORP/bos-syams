import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createStockOpname, listStockOpnames } from "@/lib/phase4-service";
import { stockOpnameCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("INVENTORY", "VIEW", async () => ok(await listStockOpnames()));

export const POST = withPermission("INVENTORY", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, stockOpnameCreateSchema);
  return created(await createStockOpname(input, actor, getClientIp(req)));
});
