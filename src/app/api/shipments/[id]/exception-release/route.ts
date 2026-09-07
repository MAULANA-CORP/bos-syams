import { getClientIp, ok, readJson, withAuth } from "@/lib/api-helpers";
import { releaseShipmentByException } from "@/lib/phase5-service";
import { shipmentExceptionReleaseSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withAuth(async ({ req, actor }, context) => {
  const input = await readJson(req, shipmentExceptionReleaseSchema);
  return ok(await releaseShipmentByException(await getId(context), input, actor, getClientIp(req)));
});
