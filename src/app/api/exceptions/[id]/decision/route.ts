import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { decisionSchema } from "@/lib/schemas";
import { decideException } from "@/lib/exception-service";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withPermission("EXCEPTION", "APPROVE", async ({ req, actor }, context) => {
  const id = await getId(context);
  const input = await readJson(req, decisionSchema);
  return ok(await decideException(id, input, actor, getClientIp(req)));
});
