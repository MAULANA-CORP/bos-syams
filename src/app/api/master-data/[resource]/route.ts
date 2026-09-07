import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { masterCreateSchema } from "@/lib/schemas";
import { assertMasterResource, createMasterData, listMasterData } from "@/lib/master-data-service";

export const dynamic = "force-dynamic";

async function getResource(context: unknown) {
  const typed = context as { params: Promise<{ resource: string }> | { resource: string } };
  const resource = (await typed.params).resource;
  assertMasterResource(resource);
  return resource;
}

export const GET = withPermission("MASTER_DATA", "VIEW", async (_ctx, context) => {
  const resource = await getResource(context);
  return ok(await listMasterData(resource));
});

export const POST = withPermission("MASTER_DATA", "CREATE", async ({ req, actor }, context) => {
  const resource = await getResource(context);
  const input = await readJson(req, masterCreateSchema);
  return created(await createMasterData(resource, input, actor, getClientIp(req)));
});
