import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createMakloonJob, listMakloonJobs } from "@/lib/phase7-service";
import { makloonJobCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("MAKLOON", "VIEW", async ({ actor }) => ok(await listMakloonJobs(actor)));

export const POST = withPermission("MAKLOON", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, makloonJobCreateSchema);
  return created(await createMakloonJob(input, actor, getClientIp(req)));
});
