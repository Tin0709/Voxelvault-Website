import { createClient } from '@supabase/supabase-js';
import { S3Client } from '@aws-sdk/client-s3';
import { createApi } from './app.js';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const env = process.env;
// Render provides this public origin after assigning the service hostname.
if(!env.APP_ORIGIN&&env.RENDER_EXTERNAL_URL)env.APP_ORIGIN=env.RENDER_EXTERNAL_URL;
const production=env.NODE_ENV==='production'||process.argv.includes('--production');
const staticDir=production?fileURLToPath(new URL('../dist/',import.meta.url)):null;
if(production){
  const missing=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET','APP_ORIGIN'].filter(key=>!env[key]);
  if(missing.length)throw new Error('Missing production variables: '+missing.join(', '));
  const origin=new URL(env.APP_ORIGIN);
  if(origin.origin!==env.APP_ORIGIN||!['http:','https:'].includes(origin.protocol))throw new Error('APP_ORIGIN must be an exact HTTP(S) origin without a trailing slash');
  if(!process.argv.includes('--cleanup')&&!existsSync(new URL('../dist/index.html',import.meta.url)))throw new Error('Missing frontend build. Run npm run build first.');
}
const configured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
const db = configured ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const r2 = env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET ? new S3Client({
  region: 'auto', endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
}) : null;
const { server, cleanup } = createApi({ db, r2, env, staticDir });

if (process.argv.includes('--cleanup')) {
  if (!db) throw new Error('Backend not configured');
  let offset = 0;
  while (true) {
    const { data: accounts, error } = await db.from('storage_accounts').select('owner_id').order('owner_id').range(offset,offset+499);
    if (error) throw error;
    for (const account of accounts) await cleanup(account.owner_id);
    if (accounts.length < 500) break;
    offset += 500;
  }
} else {
  server.listen(Number(env.PORT || 8787),env.HOST || (production?'0.0.0.0':'127.0.0.1'),()=>console.log(`VoxelVault ${production?'web + API':'API'} on port ${env.PORT || 8787}. Supabase configured: ${configured}; R2 configured: ${Boolean(r2)}`));
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{
    server.close(()=>{r2?.destroy();process.exit(0);});
    setTimeout(()=>{server.closeAllConnections();process.exit(1);},30000).unref();
  });
}
