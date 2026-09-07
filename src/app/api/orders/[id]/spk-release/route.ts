import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { releaseSchema } from "@/lib/schemas";
import { releaseSpk } from "@/lib/order-service";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withPermission("ORDER", "EXECUTE", async ({ req, actor }, context) => {
  const id = await getId(context);
  const input = await readJson(req, releaseSchema);
  return ok(await releaseSpk(id, input, actor, getClientIp(req)));
});
