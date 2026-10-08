import {environment} from '../server/environment.mjs';
try{process.loadEnvFile()}catch{}
const env=await environment(),db=env.DB;
// Store flat estimates, not a live carrier quote. User-provided J&T Luzon-origin 0-500g card.
// Supplied 2026-10-04; editable store base fees.
const rules=[['Metro Manila base delivery','', 'Metro Manila',95],['Luzon base delivery','Luzon','',85],['Visayas base delivery','Visayas','',100],['Mindanao base delivery','Mindanao','',105]];
for(const province of ['Batanes','Palawan','Marinduque','Romblon','Masbate','Catanduanes','Occidental Mindoro','Oriental Mindoro'])rules.push(['Island base delivery','',province,115]);
const existing=await db.prepare('SELECT COUNT(*) AS count FROM shipping_rates').first();
if(Number(existing.count)===0){await db.batch(rules.map(([name,region,province,pesos])=>db.prepare('INSERT INTO shipping_rates (name,region,province,rate,active,cod_allowed) VALUES (?,?,?,?,1,0)').bind(name,region,province,pesos*100)));console.log('Editable base shipping estimates configured.');}else console.log('Existing shipping rules preserved.');
if(db.close)db.close();
if(process.env.DATABASE_URL){const{prisma}=await import('../server/postgres.mjs');await prisma.$disconnect();}
