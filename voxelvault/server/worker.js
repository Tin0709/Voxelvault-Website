import { createClient } from '@supabase/supabase-js';
import { fileTypeFromBuffer } from 'file-type';
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

// Internal only: MIME must come from bytes, never client Content-Type/filename.
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
    try {
      checked(await db.from('upload_sessions').update({ status: 'deleting', draft_id: null })
        .eq('id', record.id).eq('owner_id', user.id).eq('status', 'pending'));
    } catch { console.error('Upload reservation cleanup pending'); }
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

// Internal only: small, non-image uploads prepared by prepareUpload.
export async function writeSupabaseUpload(db, prepared, body) {
  const { record, user, size, kind, mime, provider } = prepared;
  validateUpload(kind, size);
  if (provider !== 'supabase' || record?.provider !== 'supabase' || record.status !== 'pending' ||
      !user?.id || record.owner_id !== user.id || record.size_bytes !== size ||
      !record.bucket || !record.object_key || kind === 'image' ||
      typeof mime !== 'string' || storageFor(mime, size) !== 'supabase') {
    throw fail(400, 'Invalid Supabase upload reservation');
  }
  if (!body || body.locked || typeof body.getReader !== 'function') throw fail(400, 'Invalid upload body');
  // Allocate only the validated sub-1 MB size, never the entire untrusted body.
  const bytes = new Uint8Array(size);
  const reader = body.getReader();
  let received = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array) || received + value.byteLength > size) {
        throw fail(400, 'File size does not match');
      }
      bytes.set(value, received);
      received += value.byteLength;
    }
    if (received !== size) throw fail(400, 'File size does not match');
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const storage = db.storage.from(record.bucket);
  try {
    checked(await storage.upload(record.object_key, bytes, { contentType: mime, upsert: false }));
    const info = checked(await storage.info(record.object_key));
    if (Number(info?.metadata?.size ?? info?.size) !== size) throw fail(502, 'Stored size verification failed');
    return info;
  } catch (error) {
    try {
      checked(await storage.remove([record.object_key]));
    } catch {
      throw Object.assign(fail(503, 'Supabase upload failed; object cleanup must be retried'), { cleanupRequired: true, cause: error });
    }
    throw error;
  }
}

// Sniff at most 4100 bytes, retaining only that prefix and any remainder of the
// last input chunk. Replay with backpressure; never tee or collect the full body.
async function sniffUpload(body, size) {
  const reader = (body || new Blob([]).stream()).getReader();
  const prefix = new Uint8Array(Math.min(4100, size));
  let used = 0, remainder, ended = false;
  try {
    while (used < prefix.length) {
      const { value, done } = await reader.read();
      if (done) { ended = true; break; }
      const take = Math.min(value.byteLength, prefix.length - used);
      prefix.set(value.subarray(0, take), used);
      used += take;
      if (take < value.byteLength) remainder = value.subarray(take);
    }
    const detected = await fileTypeFromBuffer(prefix.subarray(0, used)).catch(() => null);
    let replayPrefix = used > 0, received = 0;
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          let chunk;
          if (replayPrefix) { replayPrefix = false; chunk = prefix.subarray(0, used); }
          else if (remainder) { chunk = remainder; remainder = null; }
          else if (!ended) {
            const next = await reader.read();
            ended = next.done;
            chunk = next.value;
          }
          if (chunk) {
            received += chunk.byteLength;
            if (received > size) throw fail(400, 'File size does not match');
            controller.enqueue(chunk);
          } else {
            if (received !== size) throw fail(400, 'File size does not match');
            reader.releaseLock();
            controller.close();
          }
        } catch (error) {
          await reader.cancel(error).catch(() => {});
          reader.releaseLock();
          controller.error(error);
        }
      },
      async cancel(reason) { try { await reader.cancel(reason); } finally { reader.releaseLock(); } },
    }, { highWaterMark: 0 });
    return { mime: detected?.mime ?? 'application/octet-stream', stream };
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    reader.releaseLock();
    throw error;
  }
}

async function imageSigningKey(env) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(env.IMAGE_SIGNING_SECRET || env.SUPABASE_SERVICE_ROLE_KEY),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function validImageSignature(env, id, url) {
  const expires = url.searchParams.get('expires') || '';
  const signature = url.searchParams.get('signature') || '';
  if (!/^\d{10}$/.test(expires) || Number(expires) < Date.now() / 1000 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const bytes = Uint8Array.from(signature.match(/../g), hex => parseInt(hex, 16));
  return crypto.subtle.verify('HMAC', await imageSigningKey(env), bytes, new TextEncoder().encode(id + ':' + expires));
}

async function uploadPreview(env, id) {
  const expires = String(Math.floor(Date.now() / 1000) + 86400);
  const encoder = new TextEncoder();
  const key = await imageSigningKey(env);
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(id + ':' + expires))),
    byte => byte.toString(16).padStart(2, '0')).join('');
  return (env.PUBLIC_API_URL || '') + '/api/images/' + id + '?expires=' + expires + '&signature=' + signature;
}

async function completeUpload(request, db, env) {
  await userFor(request, db); // Authenticate before reading any file bytes.
  const declared = request.headers.get('Content-Length');
  const size = declared === null || declared.trim() === '' ? NaN : Number(declared);
  validateUpload(new URL(request.url).searchParams.get('kind'), size);
  let prepared, replay;
  try {
    const sniffed = await sniffUpload(request.body, size);
    replay = sniffed.stream;
    prepared = await prepareUpload(request, db, sniffed.mime);
    const { record, user, kind, name, mime, provider } = prepared;
    const preview = kind === 'image' ? { src: await uploadPreview(env, record.id), alt: name } : {};
    if (provider === 'r2') await writeR2Upload(env, prepared, replay);
    else await writeSupabaseUpload(db, prepared, replay);
    checked(await db.from('upload_sessions').update({ status: 'ready', mime_type: mime })
      .eq('id', record.id).eq('owner_id', user.id).eq('status', 'pending').select().single());
    return { id: record.id, originalName: name, sizeBytes: size, mimeType: mime, typeLabel: mime,
      status: 'ready', provider, ...preview };
  } catch (error) {
    if (replay && !replay.locked) await replay.cancel(error).catch(() => {});
    if (prepared) {
      const { record, user, provider } = prepared;
      // Keep the row until object deletion succeeds, retaining quota for retries.
      // Cleanup failures must never mask the primary upload error.
      let marked = false;
      try {
        checked(await db.from('upload_sessions').update({ status: 'deleting', draft_id: null })
          .eq('id', record.id).eq('owner_id', user.id));
        marked = true;
      } catch { console.error('Upload cleanup state update pending'); }
      try {
        if (provider === 'r2') await env.FILES_BUCKET.delete(record.object_key);
        else checked(await db.storage.from(record.bucket).remove([record.object_key]));
        if (marked) checked(await db.from('upload_sessions').delete()
          .eq('id', record.id).eq('owner_id', user.id).eq('status', 'deleting'));
      } catch { console.error('Upload object cleanup pending'); }
    }
    const primary = error.cleanupRequired && error.cause ? error.cause : error;
    throw primary.cause?.status === 400 ? primary.cause : primary;
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
    const imageRequest = /^\/api\/images\/[^/]+$/.test(path);
    const uploadRequest = request.method === 'POST' && path === '/api/uploads';
    if (!uploadRequest && (request.method !== 'GET' || (!imageRequest && !fileDownload && !['/api/categories', '/api/me/categories'].includes(path)))) {
      return json({ error: 'Not found' }, 404);
    }
    try {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        throw fail(503, 'Backend not configured. Follow docs/BACKEND_SETUP.md.');
      }
      const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      if (uploadRequest) return json(await completeUpload(request, db, env), 201);
      if (imageRequest) {
        const id = requireUuid(path.split('/').pop());
        const file = checked(await db.from('upload_sessions').select('*')
          .eq('id', id).eq('status', 'ready').eq('kind', 'image').maybeSingle());
        if (!file) throw fail(404, 'Image not found');
        let published = Boolean(file.post_id);
        if (!published) {
          const profile = checked(await db.from('profiles').select('avatar_upload_id,cover_upload_id')
            .eq('id', file.owner_id).maybeSingle());
          published = profile?.avatar_upload_id === id || profile?.cover_upload_id === id;
        }
        if (!published && !await validImageSignature(env, id, new URL(request.url))) throw fail(404, 'Image not found');
        if (!env.FILES_BUCKET) throw fail(503, 'R2 is not configured');
        const object = await env.FILES_BUCKET.get(file.object_key);
        if (!object) throw fail(404, 'Image not found');
        headers.set('Content-Type', file.mime_type);
        headers.set('Content-Length', String(file.size_bytes));
        headers.set('Cache-Control', published ? 'public, max-age=300' : 'private, no-store');
        headers.set('Referrer-Policy', 'no-referrer');
        return new Response(object.body, { headers });
      }
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
