import { getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { updateMakloonStatus } from "@/lib/phase7-service";
import { makloonStatusSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getId(context: unknown) {
  const typed = context as { params: Promise<{ id: string }> | { id: string } };
  return (await typed.params).id;
}

export const POST = withPermission("MAKLOON", "EXECUTE", async ({ req, actor }, context) => {
  const input = await readJson(req, makloonStatusSchema);
  return ok(await updateMakloonStatus(await getId(context), input, actor, getClientIp(req)));
});
