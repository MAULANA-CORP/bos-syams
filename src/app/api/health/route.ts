import { ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ status: "ok", app: "BOS Syams", time: new Date().toISOString() });
}
