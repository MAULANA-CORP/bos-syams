import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createRevisionRequest, listRevisionRequests } from "@/lib/revision-service";
import { revisionCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("REVISION", "VIEW", async ({ req }) => {
  const status = req.nextUrl.searchParams.get("status");
  return ok(await listRevisionRequests(status === "DONE" || status === "OPEN" ? status : undefined));
});

export const POST = withPermission("REVISION", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, revisionCreateSchema);
  return created(await createRevisionRequest(input, actor, getClientIp(req)));
});
