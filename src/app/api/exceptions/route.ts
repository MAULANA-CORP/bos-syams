import { exceptionCreateSchema } from "@/lib/schemas";
import { createException, listExceptions } from "@/lib/exception-service";
import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission("EXCEPTION", "VIEW", async () => ok(await listExceptions()));

export const POST = withPermission("EXCEPTION", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, exceptionCreateSchema);
  return created(await createException(input, actor, getClientIp(req)));
});
