import {seed} from '../server/seed.mjs';
import {environment} from '../server/environment.mjs';
import fs from 'node:fs';
import {importLaunchConfig} from '../server/launch-config.mjs';
try{process.loadEnvFile()}catch{}
if(!process.env.ADMIN_SEED_HASH)throw Error('Set ADMIN_SEED_HASH securely before deliberate initial seeding.');
const env=await environment();
const before=await env.DB.prepare('SELECT COUNT(*) AS count FROM store_settings').first();
await seed({...env,ADMIN_SEED_HASH:process.env.ADMIN_SEED_HASH,ADMIN_REQUIRE_PASSWORD_CHANGE:process.env.ADMIN_REQUIRE_PASSWORD_CHANGE});
if(Number(before.count)===0&&fs.existsSync('data/store-launch.json'))await importLaunchConfig(env.DB,JSON.parse(fs.readFileSync('data/store-launch.json','utf8')));
if(process.env.DATABASE_URL){const{prisma}=await import('../server/postgres.mjs');await prisma.$disconnect();}
console.log('BEL initial seed applied. Existing store settings and accounts were preserved.');
