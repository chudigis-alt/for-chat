import { handle } from "../../../../server/tweentees/api.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function dispatch(req) {
  try {
    return await handle(req);
  } catch {
    return Response.json(
      { error: "The service is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export {
  dispatch as GET,
  dispatch as POST,
  dispatch as PUT,
  dispatch as DELETE,
  dispatch as PATCH,
  dispatch as OPTIONS,
  dispatch as HEAD,
};
