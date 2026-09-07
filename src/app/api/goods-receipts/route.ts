import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createGoodsReceipt, listGoodsReceipts } from "@/lib/phase4-service";
import { goodsReceiptCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("INVENTORY", "VIEW", async () => ok(await listGoodsReceipts()));

export const POST = withPermission("INVENTORY", "EXECUTE", async ({ req, actor }) => {
  const input = await readJson(req, goodsReceiptCreateSchema);
  return created(await createGoodsReceipt(input, actor, getClientIp(req)));
});
