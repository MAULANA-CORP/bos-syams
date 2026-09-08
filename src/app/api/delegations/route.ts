import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createDelegation, listDelegations } from "@/lib/delegation-service";
import { delegationCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("DELEGATION", "VIEW", async () => ok(await listDelegations()));
export const POST = withPermission("DELEGATION", "CREATE", async ({ req, actor }) => created(await createDelegation(await readJson(req, delegationCreateSchema), actor, getClientIp(req))));
