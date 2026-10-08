import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {appOrigin} from '../server/environment.mjs';
import {fileBucket} from '../server/file-bucket.mjs';
import {initialAdminHash} from '../server/initial-admin.mjs';
import {localDatabase} from '../server/local-db.mjs';
import {seed} from '../server/seed.mjs';
import {handle} from '../server/api.mjs';

test('Render hostname supplies the exact production origin; explicit custom domains take precedence',()=>{
 assert.equal(appOrigin({NODE_ENV:'production',RENDER_EXTERNAL_URL:'https://bel-example.onrender.com/'}),'https://bel-example.onrender.com');
 assert.equal(appOrigin({NODE_ENV:'production',RENDER_EXTERNAL_URL:'https://bel-example.onrender.com',APP_ORIGIN:'https://shop.example.com'}),'https://shop.example.com');
 assert.equal(appOrigin({NODE_ENV:'production'}),undefined);
});

test('Persistent upload disk survives reopening and blocks traversal',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bel-upload-test-'));
 try {
  const id=crypto.randomUUID(),bytes=Buffer.from('retained upload');
  await fileBucket(directory).put(id,bytes);
  assert.deepEqual((await fileBucket(directory).get(id)).body,bytes);
  assert.equal(await fileBucket(directory).get(crypto.randomUUID()),null);
  await assert.rejects(fileBucket(directory).get('../outside'));
  await assert.rejects(fileBucket(directory).put('../outside',bytes));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('Generated initial password supports login and repeat seeding preserves the account',async()=>{
 const password=crypto.randomUUID()+'Aa7',hash=await initialAdminHash({ADMIN_INITIAL_PASSWORD:password});
 assert.equal(await bcrypt.compare(password,hash),true);
 assert.equal(await initialAdminHash({ADMIN_SEED_HASH:hash,ADMIN_INITIAL_PASSWORD:'ignored'}),hash);
 await assert.rejects(initialAdminHash({}));
 await assert.rejects(initialAdminHash({ADMIN_INITIAL_PASSWORD:'short'}));
 const DB=localDatabase(':memory:'),APP_ORIGIN='https://bel-example.onrender.com',env={DB,APP_ORIGIN};
 try{
  await seed({...env,ADMIN_SEED_HASH:hash,ADMIN_REQUIRE_PASSWORD_CHANGE:'true'});
  await seed({...env,ADMIN_SEED_HASH:await initialAdminHash({ADMIN_INITIAL_PASSWORD:crypto.randomUUID()+'Aa7'})});
  const req=new Request(APP_ORIGIN+'/api/admin/login',{method:'POST',headers:{origin:APP_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({username:'bel',password})});
  const response=await handle(req,env),data=await response.json();
  assert.equal(response.status,200);
  assert.equal(data.username,'bel');
  assert.equal(data.must_change,true);
  assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict; Max-Age=28800; Secure/);
  const store=await handle(new Request(APP_ORIGIN+'/api/store'),env);
  assert.equal((await store.json()).products.length,2);
 }finally{DB.close();}
});
