import { createClient } from '@supabase/supabase-js';
import { S3Client } from '@aws-sdk/client-s3';
import { createApi } from './app.js';

const env = process.env;
const configured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
const db = configured ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const r2 = env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET ? new S3Client({
  region: 'auto', endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
}) : null;
const { server, cleanup } = createApi({ db, r2, env });

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
  server.listen(Number(env.PORT || 8787),env.HOST || '127.0.0.1',()=>console.log(`VoxelVault API on port ${env.PORT || 8787}. Supabase configured: ${configured}; R2 configured: ${Boolean(r2)}`));
}
