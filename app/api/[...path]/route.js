// The previous BEL application is archived in source and is not an active API.
export const dynamic='force-dynamic';
function retired(){return Response.json({error:'This endpoint is no longer available.'},{status:410,headers:{'Cache-Control':'no-store'}});}
export {retired as GET,retired as POST,retired as PUT,retired as DELETE,retired as PATCH,retired as OPTIONS};
