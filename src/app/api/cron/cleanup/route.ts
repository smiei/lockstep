import { timingSafeEqual } from "node:crypto";
import { IS_PUBLIC_INSTANCE } from "@/lib/instance";
import { deleteAbandonedRuns } from "@/lib/runHousekeeping";

export const dynamic = "force-dynamic";

// Called once a day by the cron in vercel.json (a Hobby plan allows nothing
// more frequent). Vercel sends `Authorization: Bearer $CRON_SECRET` when that
// environment variable is set on the project, and nothing else can call this
// usefully: without the secret configured it answers nobody.
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  // A private instance has every run in one place, on purpose, and no cron.
  if (!IS_PUBLIC_INSTANCE) return new Response(null, { status: 404 });
  if (!isAuthorized(request)) return new Response(null, { status: 401 });
  const deleted = await deleteAbandonedRuns();
  return Response.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
}
