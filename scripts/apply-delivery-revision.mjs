import {environment} from '../server/environment.mjs';
import {defaults} from '../server/seed.mjs';
try{process.loadEnvFile()}catch{}
const env=await environment(),db=env.DB;
const updates=[];
for(const [key,value] of Object.entries(defaults))updates.push(db.prepare('INSERT OR IGNORE INTO store_settings (key,value) VALUES (?,?)').bind(key,JSON.stringify(value)));
for(const [key,value] of Object.entries({gcash_enabled:true,gcash_show_number:false,lalamove_enabled:true,free_delivery_threshold:0,delivery_notes:'BEL delivers within Lubao with COD. Other cities require GCash payment before dispatch. Lalamove is arranged manually; rider fees are confirmed separately.'}))updates.push(db.prepare('UPDATE store_settings SET value=? WHERE key=?').bind(JSON.stringify(value),key));
// User-supplied J&T Luzon-origin 0–500g rate card. All fees remain editable.
for(const [name,rate] of [['Metro Manila base delivery',95],['Luzon base delivery',85],['Visayas base delivery',100],['Mindanao base delivery',105],['Island base delivery',115]])updates.push(db.prepare('UPDATE shipping_rates SET rate=?,cod_allowed=0,updated_at=CURRENT_TIMESTAMP WHERE name=?').bind(rate*100,name));
const local=await db.prepare('SELECT id FROM shipping_rates WHERE province=? AND city=?').bind('Pampanga','Lubao').first();
if(local)updates.push(db.prepare('UPDATE shipping_rates SET cod_allowed=1 WHERE id=?').bind(local.id));
else updates.push(db.prepare('INSERT INTO shipping_rates(name,province,city,rate,active,cod_allowed) VALUES (?,?,?,0,1,1)').bind('BEL local delivery · Lubao','Pampanga','Lubao'));
await db.batch(updates);
if(db.close)db.close();
if(process.env.DATABASE_URL){const{prisma}=await import('../server/postgres.mjs');await prisma.$disconnect();}
console.log('Supplied 0–500g fees, Lubao COD, manual Lalamove, and QR payment settings applied.');
