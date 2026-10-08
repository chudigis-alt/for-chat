import {environment} from '../../../server/environment.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const {DB} = await environment();
    await DB.prepare('SELECT COUNT(*) AS count FROM products').first();
    return Response.json({status: 'ok'}, {headers: {'Cache-Control': 'no-store'}});
  } catch {
    return Response.json({status: 'unavailable'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}
