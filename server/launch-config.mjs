export async function importLaunchConfig(db,config){
 const queries=Object.entries(config.settings).map(([key,value])=>db.prepare('INSERT INTO store_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(value)));
 const existing=await db.prepare('SELECT COUNT(*) AS count FROM shipping_rates').first();
 if(Number(existing.count)===0)for(const rule of config.shipping)queries.push(db.prepare('INSERT INTO shipping_rates(name,region,province,city,rate,active,cod_allowed) VALUES (?,?,?,?,?,?,?)').bind(rule.name,rule.region,rule.province,rule.city,rule.rate,rule.active,rule.cod_allowed));
 await db.batch(queries);
}
