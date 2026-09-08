import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { updateShipmentStatus } from "@/lib/phase5-service";
import { shipmentStatusSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withPermission("SHIPMENT", "EXECUTE", async ({ req, actor }, context) => {
  const input = await readJson(req, shipmentStatusSchema);
  return ok(await updateShipmentStatus(await getId(context), input, actor, getClientIp(req)));
});
