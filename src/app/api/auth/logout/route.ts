import { fail, getClientIp, ok, withAuth } from "@/lib/api-helpers";
import { getSession } from "@/lib/session";
import { catatAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const POST = withAuth(async ({ req, actor }) => {
  try {
    await catatAudit({ entitasType: "User", entitasId: actor.id, aksi: "LOGOUT", actor, ipAddress: getClientIp(req) });
    const session = await getSession();
    session.destroy();
    return ok({ loggedOut: true });
  } catch (error) {
    return fail(error);
  }
});
