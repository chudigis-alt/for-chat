import {handle} from '../../../server/api.mjs';
import {environment} from '../../../server/environment.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function dispatch(req){let result;try{result=await handle(req,await environment())}catch{result=Response.json({error:'The store is temporarily unavailable.'},{status:503})}result.headers.set('Cache-Control','private, no-store');result.headers.set('X-Robots-Tag','noindex, nofollow');return result;}
export {dispatch as GET,dispatch as POST,dispatch as PUT,dispatch as DELETE,dispatch as PATCH,dispatch as OPTIONS,dispatch as HEAD};
