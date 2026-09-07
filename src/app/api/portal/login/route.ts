import { fail, ok, readJson } from "@/lib/api-helpers";
import { authenticatePortal } from "@/lib/phase6-service";
import { getSession } from "@/lib/session";
import { portalLoginSchema } from "@/lib/schemas";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const input = await readJson(req, portalLoginSchema);
    const portal = await authenticatePortal(input.email, input.password);
    const session = await getSession();
    session.portalAccountId = portal.id;
    session.portalBuyerId = portal.buyerId;
    session.portalEmail = portal.email;
    session.isPortalLoggedIn = true;
    await session.save();
    return ok(portal);
  } catch (error) {
    return fail(error);
  }
}
