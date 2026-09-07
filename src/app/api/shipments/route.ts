import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createShipment, listShipments } from "@/lib/phase5-service";
import { shipmentCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("SHIPMENT", "VIEW", async () => ok(await listShipments()));

export const POST = withPermission("SHIPMENT", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, shipmentCreateSchema);
  return created(await createShipment(input, actor, getClientIp(req)));
});
