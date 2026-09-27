import { createClient } from '@supabase/supabase-js';
import { requireUuid, storageFor, validateUpload } from './validation.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const checked = ({ data, error }) => { if (error) throw error; return data; };

async function userFor(request, db) {
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw fail(401, 'Please sign in');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw fail(401, 'Session expired. Please sign in again.');
  return data.user;
}

// Internal only: Phase 3B-2 must supply MIME detected from bytes, never a client
// Content-Type/filename. No HTTP route calls this until object storage is ready.
export async function prepareUpload(request, db, detectedMime) {
  const user = await userFor(request, db);
  const url = new URL(request.url);
  const declaredSize = request.headers.get('Content-Length');
  const size = declaredSize === null || declaredSize.trim() === '' ? NaN : Number(declaredSize);
  const kind = url.searchParams.get('kind');
  validateUpload(kind, size);
  const draftId = url.searchParams.get('draft');
  if (draftId) requireUuid(draftId);
  const name = (url.searchParams.get('name') ?? '').trim();
  if (!name || name.length > 255) throw fail(400, 'Invalid filename');
  if (typeof detectedMime !== 'string' || !/^[\w!#$&^.+-]+\/[\w!#$&^.+-]+$/.test(detectedMime)) {
    throw fail(400, 'Invalid MIME type');
  }
  const mime = detectedMime.toLowerCase();
  if (kind === 'image' && !['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(mime)) {
    throw fail(400, 'Invalid or unsupported image');
  }
  const provider = storageFor(mime, size);
  let record = checked(await db.rpc(draftId ? 'reserve_draft_upload' : 'reserve_upload', {
    p_owner: user.id, p_id: crypto.randomUUID(), p_name: name,
    p_mime: 'application/octet-stream', p_size: size, p_kind: kind,
    ...(draftId ? { p_draft: draftId } : {}),
  }));
  try {
    if (record.provider !== provider) {
      record = checked(await db.from('upload_sessions').update({ provider })
        .eq('id', record.id).eq('owner_id', user.id).eq('status', 'pending').select().single());
    }
  } catch (error) {
    // No object exists yet; retain a durable cleanup record if preparation fails.
    await db.from('upload_sessions').update({ status: 'deleting', draft_id: null })
      .eq('id', record.id).eq('owner_id', user.id).eq('status', 'pending');
    throw error;
  }
  return { user, record, size, kind, name, mime, provider };
}

// Internal only: consume prepareUpload's result and the original/replayed byte
// stream. MIME sniffing belongs upstream; this helper never reads a full body.
export async function writeR2Upload(env, prepared, body) {
  const { record, user, size, kind, mime, provider } = prepared;
  validateUpload(kind, size);
  if (provider !== 'r2' || record?.provider !== 'r2' || record.status !== 'pending' ||
      !user?.id || record.owner_id !== user.id || record.size_bytes !== size || !record.object_key) {
    throw fail(400, 'Invalid R2 upload reservation');
  }
  if (!env.FILES_BUCKET) throw fail(503, 'R2 is not configured yet');
  if (!body || body.locked || typeof body.pipeTo !== 'function') throw fail(400, 'Invalid upload body');

  // R2 requires a known-length stream. This enforces the received byte count
  // with backpressure, including bodies shorter or longer than declared.
  const fixed = new FixedLengthStream(size);
  const abort = new AbortController();
  const transfer = body.pipeTo(fixed.writable, { signal: abort.signal });
  const write = Promise.resolve().then(() => env.FILES_BUCKET.put(
    record.object_key, fixed.readable, { httpMetadata: { contentType: mime } },
  ));
  try {
    const [object] = await Promise.all([write, transfer]);
    // put returns stored metadata, so a separate head request is unnecessary.
    if (!object || object.size !== size) throw fail(502, 'Stored size verification failed');
    return object;
  } catch (error) {
    abort.abort();
    // Release backpressure if put failed before consuming the readable side.
    await fixed.readable.cancel(error).catch(() => {});
    await Promise.allSettled([transfer, write]);
    try {
      await env.FILES_BUCKET.delete(record.object_key);
    } catch {
      // The later lifecycle handler must keep the reservation for cleanup retry.
      throw Object.assign(fail(503, 'R2 upload failed; object cleanup must be retried'), { cleanupRequired: true, cause: error });
    }
    throw Object.assign(fail(502, 'R2 upload failed or stored size verification failed'), { cause: error });
  }
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const allowedOrigins = new Set([
      env.APP_ORIGIN || 'http://localhost:5173',
      ...(env.APP_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
    ]);
    const headers = new Headers({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Vary': 'Origin',
    });
    const json = (body, status = 200) => Response.json(body, { status, headers });
    if (origin && !allowedOrigins.has(origin)) {
      return json({ error: 'Origin not allowed' }, 403);
    }
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Expose-Headers', 'Content-Disposition');
    }
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Headers', 'Authorization,Content-Type');
      headers.set('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
      return new Response(null, { status: 204, headers });
    }
    if (request.method === 'GET' && new URL(request.url).pathname === '/api/health') {
      // Configuration presence only; no Supabase or R2 requests.
      return json({
        configured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
        r2Configured: Boolean(env.FILES_BUCKET),
      });
    }
    const path = new URL(request.url).pathname;
    const fileDownload = /^\/api\/files\/[^/]+$/.test(path);
    if (request.method !== 'GET' || (!fileDownload && !['/api/categories', '/api/me/categories'].includes(path))) {
      return json({ error: 'Not found' }, 404);
    }
    try {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        throw fail(503, 'Backend not configured. Follow docs/BACKEND_SETUP.md.');
      }
      const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      if (fileDownload) {
        const user = await userFor(request, db);
        const file = checked(await db.from('upload_sessions').select('*')
          .eq('id', requireUuid(path.split('/').pop())).eq('owner_id', user.id)
          .eq('status', 'ready').maybeSingle());
        if (!file || !file.post_id || file.kind !== 'attachment') throw fail(404, 'File not found');
        if (file.provider !== 'r2') {
          const result = await db.storage.from(file.bucket).download(file.object_key);
          if (Number(result.error?.status) === 404 || Number(result.error?.statusCode) === 404 ||
              ['NoSuchKey', 'not_found'].includes(result.error?.code)) {
            throw fail(404, 'File not found');
          }
          const blob = checked(result);
          if (!blob) throw fail(404, 'File not found');
          headers.set('Content-Type', 'application/octet-stream');
          headers.set('Content-Length', String(file.size_bytes ?? blob.size));
          headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.original_name)}`);
          headers.set('Cache-Control', 'private, no-store');
          return new Response(blob.stream(), { headers });
        }
        if (!env.FILES_BUCKET) throw fail(503, 'R2 not configured');
        const object = await env.FILES_BUCKET.get(file.object_key);
        if (!object) throw fail(404, 'File not found');
        headers.set('Content-Type', 'application/octet-stream');
        headers.set('Content-Length', String(file.size_bytes));
        headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.original_name)}`);
        headers.set('Cache-Control', 'private, no-store');
        return new Response(object.body, { headers });
      }
      const user = path === '/api/me/categories' ? await userFor(request, db) : null;
      const categories = new Set();
      for (let offset = 0; ; offset += 1000) {
        let query = db.from('posts').select('category');
        if (user) query = query.eq('owner_id', user.id);
        const rows = checked(await query.order('id').range(offset, offset + 999));
        rows.forEach(row => categories.add(row.category));
        if (rows.length < 1000) break;
      }
      return json({ categories: [...categories].sort() });
    } catch (error) {
      const expected = error.status || error.code === 'P0001';
      if (!expected) console.error('API operation failed:', error.code ?? error.name);
      return json({ error: expected ? error.message : 'Backend request failed. Check configuration and database migration.' },
        error.status ?? (error.code === 'P0001' ? 409 : 500));
    }
  },
};
