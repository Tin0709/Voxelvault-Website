import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createApi} from '../server/app.js';

test('production serves SPA routes and assets without exposing source, secrets or hiding API errors',async()=>{
  const root=await mkdtemp(join(tmpdir(),'voxelvault-production-'));
  const dist=join(root,'dist');await mkdir(join(dist,'assets'),{recursive:true});
  await writeFile(join(root,'.env.server.local'),'PRIVATE_SENTINEL');
  await writeFile(join(dist,'index.html'),'<!doctype html><main>VoxelVault</main>');
  await writeFile(join(dist,'assets','app-hash.js'),'console.log("app")');
  const {server}=createApi({staticDir:dist});server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    for(const path of ['/','/explore','/creations/123','/login']){
      const res=await fetch(base+path,{headers:{Accept:'text/html'}});
      assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/text\/html/);
      assert.equal(res.headers.get('cache-control'),'no-cache');assert.match(await res.text(),/VoxelVault/);
    }
    const asset=await fetch(base+'/assets/app-hash.js');assert.equal(asset.status,200);
    assert.match(asset.headers.get('content-type'),/javascript/);assert.match(asset.headers.get('cache-control'),/immutable/);
    const head=await fetch(base+'/assets/app-hash.js',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
    for(const path of ['/.env.server.local','/%2eenv.server.local','/assets/missing.js','/server/index.js','/assets/..%5c..%5c.env.server.local']){
      const res=await fetch(base+path,{headers:{Accept:'text/html'}});assert.equal(res.status,404,path);assert.doesNotMatch(await res.text(),/PRIVATE_SENTINEL/);
    }
    assert.equal((await fetch(base+'/explore',{method:'POST'})).status,405);
    assert.equal((await fetch(base+'/explore',{headers:{Origin:'https://foreign.example',Accept:'text/html'}})).status,403);
    const health=await fetch(base+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).configured,false);
    const api=await fetch(base+'/api/posts',{headers:{Accept:'text/html'}});assert.equal(api.status,503);assert.match(api.headers.get('content-type'),/application\/json/);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});}
});
