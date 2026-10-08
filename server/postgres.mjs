import {PrismaClient} from '@prisma/client';
const globalDb=globalThis;
export const prisma=globalDb.belPrisma||(globalDb.belPrisma=new PrismaClient({log:[]}));
const serial=new Set(['products','orders','payments','order_items','product_images','inventory_movements','contact_messages','shipping_rates','reseller_inquiries','audit_logs']);
const normalize=v=>typeof v==='bigint'?Number(v):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
function compile(source){let n=0;let sql=source.replace(/\?/g,()=>'$'+(++n)).replace(/updated_at=CURRENT_TIMESTAMP/g,"updated_at=to_char(timezone('UTC',now()),'YYYY-MM-DD HH24:MI:SS')");sql=sql.replace('SET count=count+1','SET count=rate_limits.count+1');const ignore=/INSERT OR IGNORE/i.test(sql);sql=sql.replace(/INSERT OR IGNORE/i,'INSERT');if(ignore)sql+=' ON CONFLICT DO NOTHING';const table=sql.match(/^INSERT INTO ([a-z_]+)/i)?.[1];if(table&&serial.has(table))sql+=' RETURNING id';return{sql,returns:!!table&&serial.has(table)}}
export function postgresDatabase(client=prisma){
 class Query{constructor(source,args=[]){this.source=source;this.args=args}bind(...args){return new Query(this.source,args)}async first(){return(await this.all()).results[0]||null}async all(tx=client){const{sql}=compile(this.source);return{results:normalize(await tx.$queryRawUnsafe(sql,...this.args))}}async run(tx=client){const{sql,returns}=compile(this.source);if(returns){const rows=await tx.$queryRawUnsafe(sql,...this.args);return{success:true,meta:{last_row_id:normalize(rows[0]?.id),changes:rows.length}}}const changes=await tx.$executeRawUnsafe(sql,...this.args);return{success:true,meta:{changes}}}}
 return{resetSequence:()=>client.$queryRawUnsafe("SELECT setval(pg_get_serial_sequence('products','id'),COALESCE((SELECT MAX(id) FROM products),1))"),prepare:sql=>new Query(sql),batch:queries=>client.$transaction(async tx=>{const results=[];for(const q of queries)results.push(await q.run(tx));return results},{maxWait:10000,timeout:20000})};
}

