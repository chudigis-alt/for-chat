import { database } from "../../../server/tweentees/db.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const rows = await database().query(
      "SELECT id FROM tt_settings WHERE id=?",
      ["website"],
    );
    if (!rows.length) throw Error("Setup required");
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
