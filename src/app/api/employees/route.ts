import { created, getClientIp, ok, readJson, withPermission } from "@/lib/api-helpers";
import { createEmployee, listEmployees } from "@/lib/phase7-service";
import { employeeCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = withPermission("EMPLOYEE", "VIEW", async ({ actor }) => ok(await listEmployees(actor)));

export const POST = withPermission("EMPLOYEE", "CREATE", async ({ req, actor }) => {
  const input = await readJson(req, employeeCreateSchema);
  return created(await createEmployee(input, actor, getClientIp(req)));
});
