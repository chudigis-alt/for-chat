import fs from 'node:fs';
// Next.js may expose an internal localhost URL while the browser uses 127.0.0.1.
export function appOrigin(config=process.env){return config.APP_ORIGIN||(config.RENDER_EXTERNAL_URL?new URL(config.RENDER_EXTERNAL_URL).origin:undefined)||(config.NODE_ENV==='production'?undefined:'http://127.0.0.1:'+(config.PORT||5173))}
let cached;
export async function environment(){if(cached)return cached;
 if(process.env.DATABASE_URL){const origin=appOrigin();if(process.env.NODE_ENV==='production'&&!origin)throw Error('APP_ORIGIN is required.');const{postgresDatabase}=await import('./postgres.mjs');const{put,list}=await import('@vercel/blob');const persistentBucket=process.env.BEL_UPLOAD_DIR?(await import('./file-bucket.mjs')).fileBucket(process.env.BEL_UPLOAD_DIR):null;cached={DB:postgresDatabase(),APP_ORIGIN:origin,BUCKET:persistentBucket||(process.env.BLOB_READ_WRITE_TOKEN?{put:async(id,bytes,options)=>{await put('bel/'+id,bytes,{access:'public',addRandomSuffix:false,contentType:options.httpMetadata.contentType,token:process.env.BLOB_READ_WRITE_TOKEN})},get:async id=>{const{blobs}=await list({prefix:'bel/'+id,limit:1,token:process.env.BLOB_READ_WRITE_TOKEN});const b=blobs.find(b=>b.pathname==='bel/'+id);if(!b)return null;const r=await fetch(b.url);return r.ok?{body:r.body}:null}}:null)};return cached;}
 if(process.env.NODE_ENV==='production')throw Error('DATABASE_URL is required for production.');
 const{localDatabase,localBucket}=await import('./local-db.mjs');fs.mkdirSync('.data',{recursive:true});cached={DB:localDatabase(process.env.BEL_DEV_DB||'.data/bel.sqlite'),BUCKET:localBucket('.data/uploads'),APP_ORIGIN:appOrigin()};return cached;
}
