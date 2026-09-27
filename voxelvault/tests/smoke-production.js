// Explicit read-only smoke check against the configured cloud services.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
if(!process.argv.includes('--run'))throw new Error('Use --run after building dist.');
const env=parseEnv(await readFile('.env.server.local','utf8'));
const frontend=parseEnv(await readFile('.env.local','utf8'));
const port=18787,base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server/index.js','--production'],{env:{...process.env,...env,PORT:String(port),HOST:'127.0.0.1',APP_ORIGIN:base,MAX_CONCURRENT_UPLOADS:'1'},stdio:['ignore','pipe','pipe']});
const exited=once(child,'exit');
try{
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Production startup timeout')),15000);
    child.stdout.on('data',chunk=>{if(String(chunk).includes('web + API')){clearTimeout(timeout);resolve();}});
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
    child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Production startup failed: '+code));});
  });
  for(const path of ['/','/explore','/login']){
    const response=await fetch(base+path,{headers:{Accept:'text/html'}});assert.equal(response.status,200);assert.match(await response.text(),/id="root"/);
  }
  const health=await (await fetch(base+'/api/health')).json();assert.equal(health.configured,true);assert.equal(health.r2Configured,true);
  const feed=await fetch(base+'/api/feed?view=posts&seed=11111111-1111-4111-8111-111111111111',{signal:AbortSignal.timeout(60000)});
  assert.equal(feed.status,200);assert.ok(Array.isArray((await feed.json()).items));
  let bundle='';for(const name of await readdir('dist/assets'))if(name.endsWith('.js'))bundle+=await readFile('dist/assets/'+name,'utf8');
  for(const key of ['SUPABASE_SERVICE_ROLE_KEY','R2_SECRET_ACCESS_KEY','R2_ACCESS_KEY_ID','IMAGE_SIGNING_SECRET'])if(env[key])assert.equal(bundle.includes(env[key]),false,'Server credential found in browser bundle: '+key);
  assert.ok(bundle.includes(frontend.VITE_SUPABASE_URL),'Frontend Supabase URL missing');
  assert.ok(bundle.includes(frontend.VITE_SUPABASE_PUBLISHABLE_KEY),'Frontend publishable key missing');
  console.log('PASS production HTML routes, real post API, cloud configuration and bundle secret isolation');
}finally{child.kill();await exited;}
