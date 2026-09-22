// Explicit integration check against configured services; excluded from *.test.js.
// Creates two temporary confirmed users and removes only their data in finally.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

if (!process.argv.includes('--run')) throw new Error('Pass --run to create temporary cloud test data.');
const env = { ...parseEnv(readFileSync('.env.server.local', 'utf8')), ...parseEnv(readFileSync('.env.local', 'utf8')) };
const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, authOptions);
const r2 = new S3Client({ region: 'auto', endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } });
const base = 'http://localhost:5173/api';
const users = [];
const uploaded = [];
const checked = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function request(path, token, options = {}, status = 200) {
  const response = await fetch(base + path, { ...options, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }, signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, status, `${path}: expected ${status}, received ${response.status}`);
  return response;
}
async function makeUser() {
  const email = `voxelvault-test-${randomUUID()}@example.com`;
  const password = randomBytes(32).toString('hex');
  const { user } = checked(await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: 'Temporary integration test' } }));
  users.push(user.id);
  const client = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, authOptions);
  const { session } = checked(await client.auth.signInWithPassword({ email, password }));
  return { token: session.access_token, client };
}
try {
  const owner = await makeUser();
  const other = await makeUser();
  assert.equal((await (await request('/me/storage', owner.token)).json()).usedBytes, 0);
  assert.deepEqual((await (await request('/posts?mine=true', owner.token)).json()).posts, []);
  console.log('PASS new accounts have zero posts and zero usage');
  const fixtures = [
    { name: 'test.png', kind: 'image', bytes: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6XQAAAAASUVORK5CYII=', 'base64'), provider: 'supabase' },
    { name: 'small.txt', kind: 'attachment', bytes: Buffer.from('VoxelVault private integration test'), provider: 'supabase' },
    { name: 'large.bin', kind: 'attachment', bytes: randomBytes(5_000_001), provider: 'r2' },
  ];
  for (const fixture of fixtures) {
    const result = await (await request(`/uploads?kind=${fixture.kind}&name=${fixture.name}`, owner.token, { method: 'POST', body: fixture.bytes }, 201)).json();
    uploaded.push(result);
    assert.equal(result.provider, fixture.provider);
    assert.equal(result.sizeBytes, fixture.bytes.length);
  }
  console.log('PASS real image, Supabase attachment and R2 attachment uploads');
  const id = randomUUID();
  const body = { title: 'Temporary integration test', category: 'uncategorized', description: 'Automatically removed after verification.', version: 0, images: [{ id: uploaded[0].id }], attachments: uploaded.slice(1).map(({ id }) => ({ id })), externalDownloads: [{ name: 'Private link', url: 'https://example.com/private' }], creditUrl: 'https://example.com/credit' };
  const save = (token, payload, status = 200) => request(`/posts/${id}`, token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, status);
  await save(owner.token, body);
  const ownPost = await (await request(`/posts/${id}`, owner.token)).json();
  assert.equal(ownPost.attachments.length, 2);
  assert.equal(ownPost.externalDownloads.length, 1);
  assert.equal((await fetch(ownPost.image)).status, 200);
  for (const token of [null, other.token]) {
    const post = await (await request(`/posts/${id}`, token)).json();
    assert.equal(post.attachments, undefined);
    assert.equal(post.externalDownloads, undefined);
    assert.equal(post.creditUrl, body.creditUrl);
    for (const file of uploaded.slice(1)) await request(`/files/${file.id}`, token, {}, token ? 404 : 401);
  }
  for (let i = 1; i < uploaded.length; i++) {
    const download = await request(`/files/${uploaded[i].id}`, owner.token);
    assert.equal(hash(Buffer.from(await download.arrayBuffer())), hash(fixtures[i].bytes));
  }
  for (const table of ['upload_sessions', 'attachments', 'external_downloads']) {
    const rows = checked(await other.client.from(table).select('*').in(table === 'upload_sessions' ? 'id' : 'post_id', table === 'upload_sessions' ? uploaded.map(f => f.id) : [id]));
    assert.equal(rows.length, 0);
  }
  await save(other.token, { ...body, version: 1 }, 409);
  await request(`/posts/${id}`, other.token, { method: 'DELETE' }, 409);
  console.log('PASS owner downloads match SHA-256; anonymous/other account cannot access private data or mutate post');
  await save(owner.token, { ...body, version: 1, title: 'Updated integration test' });
  assert.equal((await (await request(`/posts/${id}`, owner.token)).json()).title, 'Updated integration test');
  await save(owner.token, { ...body, version: 1 }, 409);
  assert.equal((await (await request('/me/storage', owner.token)).json()).usedBytes, fixtures.reduce((sum, f) => sum + f.bytes.length, 0));
  const objects = checked(await db.from('upload_sessions').select('*').eq('owner_id', users[0]));
  await request(`/posts/${id}`, owner.token, { method: 'DELETE' });
  await request(`/posts/${id}`, null, {}, 404);
  assert.equal((await (await request('/me/storage', owner.token)).json()).usedBytes, 0);
  for (const object of objects) {
    if (object.provider === 'r2') {
      await assert.rejects(r2.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: object.object_key })), e => e.$metadata?.httpStatusCode === 404);
    } else {
      const { error } = await db.storage.from(object.bucket).info(object.object_key);
      assert.ok(error, 'Deleted storage object must be absent');
    }
  }
  console.log('PASS edits persist, stale edits rejected, deletion removes objects and releases quota');
} finally {
  // Only IDs returned by createUser in this execution are eligible for cleanup.
  for (const ownerId of users) {
    const files = checked(await db.from('upload_sessions').select('*').eq('owner_id', ownerId));
    for (const file of files) {
      if (file.provider === 'r2') await r2.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: file.object_key }));
      else checked(await db.storage.from(file.bucket).remove([file.object_key]));
    }
    checked(await db.from('posts').delete().eq('owner_id', ownerId));
    checked(await db.from('upload_sessions').delete().eq('owner_id', ownerId));
    checked(await db.auth.admin.deleteUser(ownerId));
  }
  r2.destroy();
  console.log('Temporary test accounts and data removed');
}
