import fs from 'node:fs';
import {build} from 'esbuild';
import {localDatabase} from '../server/local-db.mjs';
import {seed} from '../server/seed.mjs';
import {importLaunchConfig} from '../server/launch-config.mjs';
import {handle} from '../server/api.mjs';
import {imageUrl} from '../src/images.js';
const output='pages-dist';
const repository=process.env.GITHUB_REPOSITORY?.split('/')[1]||'for-chat';
const base=process.env.PAGES_BASE_PATH||(repository.endsWith('.github.io')?'/':'/'+repository+'/');
if(!/^\/[a-zA-Z0-9_./-]*\/$/.test(base)&&base!=='/')throw Error('Invalid Pages base path');
fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
fs.cpSync('public/assets',output+'/assets',{recursive:true});fs.copyFileSync('public/favicon.svg',output+'/favicon.svg');
const DB=localDatabase(':memory:');
try {
 await seed({DB});await importLaunchConfig(DB,JSON.parse(fs.readFileSync('data/store-launch.json','utf8')));
 const store=await (await handle(new Request('https://preview.example/api/store'),{DB})).json();
 store.settings.gcash_qr='';store.settings.gcash_enabled=false;store.settings.cod_enabled=false;
 const admin={products:store.products,settings:store.settings,orders:[],messages:[],movements:[],resellers:[],audit:[],shipping:(await DB.prepare('SELECT * FROM shipping_rates ORDER BY id').all()).results,statuses:['Pending Confirmation','Awaiting Payment Verification','Confirmed','Preparing Order','Shipped','Completed','Cancelled']};
 const {regions,provinces,cities}=JSON.parse(fs.readFileSync('data/locations.json','utf8'));
 const snapshot={store,admin,locations:{regions,provinces,cities}};
 const encoded=JSON.stringify(snapshot,(_,v)=>typeof v==='string'&&v.startsWith('/assets/')?base+imageUrl(v).slice(1):v);
 fs.writeFileSync(output+'/preview-data.json',encoded);
} finally {DB.close();}
await build({entryPoints:['preview/entry.jsx'],bundle:true,format:'esm',minify:true,outfile:output+'/site.js',define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_PAGES_PREVIEW':'"true"'},plugins:[{name:'pages-asset-paths',setup(builder){builder.onLoad({filter:/\/src\/.*\.jsx$/},async args=>({contents:(await fs.promises.readFile(args.path,'utf8')).replaceAll('/assets/',base+'assets/'),loader:'jsx'}));}}]});
fs.writeFileSync(output+'/index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>BEL website design preview</title><base href="${base}"><link rel="icon" href="favicon.svg"><link rel="stylesheet" href="site.css"></head><body><div id="root"></div><script type="module" src="site.js"></script></body></html>`);
fs.writeFileSync(output+'/.nojekyll','');
console.log('Built static design preview in '+output+' with base '+base);
