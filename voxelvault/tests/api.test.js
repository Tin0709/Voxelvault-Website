import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApi } from '../server/app.js';
import { storageFor } from '../server/validation.js';

const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const post='33333333-3333-4333-8333-333333333333';
const file='44444444-4444-4444-8444-444444444444';

function fakeBackend() {
  let downloads=0;
  const objects = new Map();
  const storageWrites = [];
  const tables={
    posts:[{id:post,owner_id:owner,title:'Public post',description:'Public',category:'art',version:1}],
    profiles:[{id:owner,name:'Owner'}],
    post_images:[],
    attachments:[{post_id:post,upload_sessions:{id:file,original_name:'secret.zip',size_bytes:3,mime_type:'application/zip',status:'ready',provider:'supabase'}}],
    external_downloads:[{id:file,post_id:post,name:'Private backup',url:'https://example.com/private-backup'}],
    upload_sessions:[{id:file,owner_id:owner,post_id:post,kind:'attachment',status:'ready',provider:'supabase',bucket:'attachments',object_key:'private-key',original_name:'secret.zip',size_bytes:3}],
  };
  return {
    auth: { getUser: async (token) => ({data:{user:token==='owner'?{id:owner}:token==='other'?{id:other}:null},error:null}) },
    from(table) {
      let rows=[...(tables[table] ?? [])];
      let change=null;
      function result(single=false) {
        if (change?.type==='update') rows.forEach((row)=>Object.assign(row,change.values));
        if (change?.type==='delete') tables[table]=tables[table].filter((row)=>!rows.includes(row));
        change=null;
        return {data:single?rows[0]??null:rows,error:null};
      }
      const query={
        select() { return query; },
        update(values) {change={type:'update',values};return query;},
        delete() {change={type:'delete'};return query;},
        eq(key,value) { rows=rows.filter((row)=>row[key]===value); return query; },
        order() { return query; },
        range(start,end) { rows=rows.slice(start,end+1); return query; },
        single() { return Promise.resolve(result(true)); },
        maybeSingle() { return Promise.resolve(result(true)); },
        then(resolve,reject) { return Promise.resolve(result()).then(resolve,reject); },
      };
      return query;
    },
    async rpc(name,args) {
      if (name==='reserve_upload') {
        const record={id:args.p_id,owner_id:args.p_owner,original_name:args.p_name,size_bytes:args.p_size,kind:args.p_kind,
          provider:storageFor(args.p_kind,args.p_size),bucket:args.p_kind==='image'?'showcase':'attachments',object_key:args.p_id,status:'pending'};
        tables.upload_sessions.push(record); return {data:record,error:null};
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
    storage:{from:(bucket)=>({
      download:async()=>{downloads++;return {data:new Blob(['abc']),error:null};},
      upload:async(key,bytes)=>{objects.set(key,bytes);storageWrites.push({bucket,size:bytes.length});return {data:{},error:null};},
      info:async(key)=>({data:{size:objects.get(key).length},error:null}),
      remove:async(keys)=>{keys.forEach((key)=>objects.delete(key));return {data:[],error:null};},
      getPublicUrl:(key)=>({data:{publicUrl:`https://example.test/showcase/${key}`}}),
    })},
    get downloads() {return downloads;},
    tables,storageWrites,
  };
}
async function running(options, callback) {
  const {server}=createApi(options);
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise((resolve)=>server.close(resolve)); }
}
test('API never exposes private files or external links to another user',async()=>{
  const db=fakeBackend();
  await running({db},async(base)=>{
    for (const headers of [{},{Authorization:'Bearer other'}]) {
      const response=await fetch(`${base}/api/posts/${post}`,{headers});
      assert.equal(response.status,200);
      const body=await response.json();
      assert.equal(body.title,'Public post');
      assert.equal('attachments' in body,false);
      assert.equal('externalDownloads' in body,false);
    }
    const own=await fetch(`${base}/api/posts/${post}`,{headers:{Authorization:'Bearer owner'}});
    assert.equal((await own.json()).externalDownloads[0].name,'Private backup');
    assert.equal((await fetch(`${base}/api/files/${file}`)).status,401);
    const stranger=await fetch(`${base}/api/files/${file}`,{headers:{Authorization:'Bearer other'}});
    assert.equal(stranger.status,404);
    assert.equal(db.downloads,0);
    const download=await fetch(`${base}/api/files/${file}`,{headers:{Authorization:'Bearer owner'}});
    assert.equal(download.status,200);
    assert.equal(await download.text(),'abc');
    assert.equal(download.headers.get('cache-control'),'private, no-store');
    assert.equal(db.downloads,1);
    const mine=await fetch(`${base}/api/posts?mine=true`,{headers:{Authorization:'Bearer other'}});
    assert.deepEqual((await mine.json()).posts,[]);
    assert.equal((await fetch(`${base}/api/posts?mine=true`,{headers:{Authorization:'Bearer invalid'}})).status,401);
    assert.equal((await fetch(`${base}/api/uploads?kind=attachment&name=x`,{method:'POST',body:'x'})).status,401);
    assert.equal((await fetch(`${base}/api/me/categories`)).status,401);
    assert.equal((await fetch(`${base}/api/posts/${post}/archive`)).status,401);
    assert.equal((await fetch(`${base}/api/posts/${post}/archive`,{headers:{Authorization:'Bearer other'}})).status,404);
    const zip=await fetch(`${base}/api/posts/${post}/archive`,{headers:{Authorization:'Bearer owner'}});
    assert.equal(zip.status,200);
    assert.equal(zip.headers.get('content-type'),'application/zip');
    assert.equal(zip.headers.get('cache-control'),'private, no-store');
    assert.ok((await zip.arrayBuffer()).byteLength>3);
    assert.deepEqual(await (await fetch(`${base}/api/me/categories`,{headers:{Authorization:'Bearer owner'}})).json(),{categories:['art']});
    assert.deepEqual(await (await fetch(`${base}/api/me/categories`,{headers:{Authorization:'Bearer other'}})).json(),{categories:[]});
  });
});
test('storage detail endpoint is authenticated and scoped to the requesting owner',async()=>{
  const db=fakeBackend();
  db.tables.storage_accounts=[{owner_id:owner,quota_bytes:200000000},{owner_id:other,quota_bytes:200000000}];
  db.tables.profiles.push({id:other});
  await running({db},async base=>{
    assert.equal((await fetch(`${base}/api/me/storage/details`)).status,401);
    const own=await (await fetch(`${base}/api/me/storage/details`,{headers:{Authorization:'Bearer owner'}})).json();
    assert.equal(own.usedBytes,3);assert.equal(own.items[0].name,'secret.zip');
    const stranger=await (await fetch(`${base}/api/me/storage/details?owner=${owner}`,{headers:{Authorization:'Bearer other'}})).json();
    assert.equal(stranger.usedBytes,0);assert.deepEqual(stranger.items,[]);
  });
});
test('API configuration failures and origin boundaries are explicit',async()=>{
  await running({},async(base)=>{
    assert.equal((await fetch(`${base}/api/posts`)).status,503);
    assert.deepEqual(await (await fetch(`${base}/api/health`)).json(),{configured:false,r2Configured:false});
    assert.equal((await fetch(`${base}/api/health`,{headers:{Origin:'https://untrusted.example'}})).status,403);
  });
});

test('uploads route small private files to Supabase, large files to R2 and reject invalid images',async()=>{
  const db=fakeBackend();
  const r2Writes=[];
  const r2={send:async(command)=>{
    if (command.constructor.name==='PutObjectCommand') {r2Writes.push(command.input);return {};}
    if (command.constructor.name==='HeadObjectCommand') return {ContentLength:r2Writes.at(-1).Body.length};
    throw new Error('Unexpected R2 command');
  }};
  await running({db,r2,env:{R2_BUCKET:'private-test'}},async(base)=>{
    async function upload(kind,bytes) {
      return fetch(`${base}/api/uploads?kind=${kind}&name=test.bin`,{method:'POST',headers:{Authorization:'Bearer owner'},body:bytes});
    }
    const small=await upload('attachment',Buffer.from('small private content'));
    assert.equal(small.status,201);
    assert.equal((await small.json()).provider,'supabase');
    assert.equal(db.storageWrites[0].bucket,'attachments');
    const large=await upload('attachment',Buffer.alloc(5_000_001));
    assert.equal(large.status,201);
    assert.equal((await large.json()).provider,'r2');
    assert.equal(r2Writes[0].Bucket,'private-test');
    assert.equal(r2Writes[0].ContentLength,5_000_001);
    const count=db.tables.upload_sessions.length;
    const invalid=await upload('image',Buffer.from('<html>not an image</html>'));
    assert.equal(invalid.status,400);
    assert.equal(db.tables.upload_sessions.length,count);
    assert.equal(db.storageWrites.length,1);
  });
});
