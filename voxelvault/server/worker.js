import { createClient } from '@supabase/supabase-js';
import { fileTypeFromBuffer } from 'file-type';
import { requireUuid, storageFor, validateUpload, validatePost } from './validation.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const checked = ({ data, error }) => { if (error) throw error; return data; };

async function userFor(request, db, required = true) {
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) { if (required) throw fail(401, 'Please sign in'); return null; }
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

function imagePath(env, id) { return (env.PUBLIC_API_URL || '') + '/api/images/' + id; }

async function uploadPreview(env, id) {
  const expires = String(Math.floor(Date.now() / 1000) + 86400);
  const encoder = new TextEncoder();
  const key = await imageSigningKey(env);
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(id + ':' + expires))),
    byte => byte.toString(16).padStart(2, '0')).join('');
  return imagePath(env, id) + '?expires=' + expires + '&signature=' + signature;
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

async function profileJson(request) {
  const reader = request.body?.getReader();
  const bytes = new Uint8Array(300000);
  let size = 0;
  try {
    if (reader) for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (size + value.byteLength > bytes.length) throw fail(413, 'Request is too large');
      bytes.set(value, size); size += value.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes.subarray(0, size)));
  } catch (error) {
    if (reader) await reader.cancel(error).catch(() => {});
    if (error.status) throw error;
    throw fail(400, 'Invalid JSON');
  } finally { reader?.releaseLock(); }
}

async function cleanupProfileUploads(db, env, ownerId) {
  const files = checked(await db.rpc('claim_cleanup', { p_owner: ownerId }));
  for (const file of files) {
    try {
      if (file.provider === 'r2') {
        if (!env.FILES_BUCKET) throw fail(503, 'R2 is not configured');
        await env.FILES_BUCKET.delete(file.object_key);
      } else checked(await db.storage.from(file.bucket).remove([file.object_key]));
      checked(await db.from('upload_sessions').delete().eq('id', file.id).eq('status', 'deleting'));
    } catch { console.error(`Cleanup pending for upload ${file.id}`); }
  }
}

// Browsing uses the same published-post tables/RPCs as the Node backend.
async function browse(request, db, env) {
  const url = new URL(request.url), path = url.pathname;
  function publicImage(file) {
    if (file.bucket === 'showcase' || !file.provider) return db.storage.from('showcase').getPublicUrl(file.object_key).data.publicUrl;
    return imagePath(env, file.id);
  }
async function hydrate(post, owner = false) {
  const profile = await profileFor(post.owner_id);
  const images = checked(await db.from('post_images').select('position,alt,upload_sessions(*)').eq('post_id', post.id).order('position'));
  const gallery = images.map((item) => ({ id: item.upload_sessions.id, src: publicImage(item.upload_sessions), alt: item.alt }));
  const result = {
    id: post.id, ownerId: post.owner_id, creatorId: post.owner_id, creator: profile.name, creatorAvatar: profile.avatarUrl,
    title: post.title, description: post.description, category: post.category, location: post.location,
    minecraftVersion: post.minecraft_version, revisionNotes: post.revision_notes,
    originalCreator: post.original_creator, originalSource: post.original_source, creditUrl: post.credit_url,
    version: post.version, gallery, image: gallery[0]?.src ?? '', alt: gallery[0]?.alt ?? '',
  };
  if (owner) {
    const files = checked(await db.from('attachments').select('upload_sessions(*)').eq('post_id', post.id));
    result.attachments = files.map(({ upload_sessions: f }) => ({ id: f.id, originalName: f.original_name, sizeBytes: f.size_bytes, mimeType: f.mime_type, typeLabel: f.mime_type, status: 'ready', provider: f.provider }));
    result.externalDownloads = checked(await db.from('external_downloads').select('id,name,url').eq('post_id', post.id));
  }
  return result;
}

async function profileFor(id) {
  const profile = checked(await db.from('profiles').select('id,name,bio,country,avatar_upload_id,cover_upload_id,version').eq('id',id).maybeSingle());
  if (!profile) throw fail(404,'Profile not found');
  let avatarUrl = '';
  let coverUrl = '';
  if (profile.cover_upload_id) {
    const file = checked(await db.from('upload_sessions').select('*').eq('id',profile.cover_upload_id).single());
    coverUrl = publicImage(file);
  }
  if (profile.avatar_upload_id) {
    const file = checked(await db.from('upload_sessions').select('*').eq('id',profile.avatar_upload_id).single());
    avatarUrl = publicImage(file);
  }
  return { id:profile.id, name:profile.name, bio:profile.bio, country:profile.country, version:profile.version,
    avatarId:profile.avatar_upload_id, avatarUrl, coverId:profile.cover_upload_id, coverUrl, handle:profile.id.slice(0,8), initials:profile.name.slice(0,2).toUpperCase() };
}

    if (path === '/api/me/profile') {
      const user = await userFor(request, db);
      if (request.method === 'POST') {
        const body = await profileJson(request);
        if (!body || typeof body.name !== 'string' || !body.name.trim() ||
            body.name.trim().length > 50 || typeof body.bio !== 'string' || body.bio.length > 1000 ||
            typeof body.country !== 'string' || !/^([A-Z]{2})?$/.test(body.country) ||
            !Number.isInteger(body.version) || body.version < 0) throw fail(400, 'Invalid profile');
        const avatar = body.avatarId === null ? null : requireUuid(body.avatarId);
        const cover = body.coverId == null ? (await profileFor(user.id)).coverId : requireUuid(body.coverId);
        checked(await db.rpc('save_profile', {
          p_owner: user.id, p_name: body.name.trim(), p_bio: body.bio, p_country: body.country,
          p_avatar: avatar, p_cover: body.coverId === null ? null : cover ?? null, p_version: body.version,
        }));
        await cleanupProfileUploads(db, env, user.id);
      }
      return { ...await profileFor(user.id), email: user.email };
    }
    if (path === '/api/feed' && request.method === 'GET') {
      const seed=requireUuid(url.searchParams.get('seed'));
      const after=url.searchParams.get('after')||'';
      const category=url.searchParams.get('category')||'';
      const search=url.searchParams.get('search')||'';
      if(after.length>80||category.length>80||search.length>200)throw fail(400,'Invalid feed request');
      const rows=checked(await db.rpc(url.searchParams.get('view')==='posts'?'post_feed':'image_feed',{p_seed:seed,p_after:after,p_category:category,p_search:search,p_limit:31}));
      const page=rows.slice(0,30);
      if(url.searchParams.get('view')==='posts'){
        const ids=page.map(row=>row.post_id);
        const posts=ids.length?checked(await db.from('posts').select('*').in('id',ids)):[];
        const byId=new Map(posts.map(post=>[post.id,post]));
        return {items:await Promise.all(ids.filter(id=>byId.has(id)).map(id=>hydrate(byId.get(id)))),next:rows.length>30?page.at(-1).sort_key:null};
      }
      const descriptions=page.length?checked(await db.from('posts').select('id,description').in('id',[...new Set(page.map(row=>row.post_id))])):[];
      const byPost=new Map(descriptions.map(post=>[post.id,post.description]));
      const imageIds=page.map(row=>row.image_id);
      const files=imageIds.length?checked(await db.from('upload_sessions').select('*').in('id',imageIds)):[];
      const byImage=new Map(files.map(f=>[f.id,f]));
      const profiles=await Promise.all([...new Set(page.map(row=>row.creator_id))].map(id=>profileFor(id)));
      const avatars=new Map(profiles.map(profile=>[profile.id,profile.avatarUrl]));
      return {items:page.map(row=>({id:row.image_id,postId:row.post_id,imageId:row.image_id,title:row.title,description:byPost.get(row.post_id)||'',category:row.category,creator:row.creator,creatorId:row.creator_id,image:publicImage(byImage.get(row.image_id)||row),alt:row.alt,creatorAvatar:avatars.get(row.creator_id)||''})),next:rows.length>30?page.at(-1).sort_key:null};
    }
    if (path === '/api/posts' && request.method === 'GET') {
      const mine = url.searchParams.get('mine') === 'true';
      const user = await userFor(request, db, mine);
      let query = db.from('posts').select('*').order('created_at', { ascending: false });
      if (mine) query = query.eq('owner_id', user.id);
      if (url.searchParams.has('creator')) query = query.eq('owner_id', requireUuid(url.searchParams.get('creator')));
      const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
      const limit=Math.min(50,Math.max(1,Number(url.searchParams.get('limit'))||50));
      const posts = checked(await query.range(offset, offset + limit-1));
      return { posts: await Promise.all(posts.map((p) => hydrate(p, mine))), hasMore: posts.length === limit };
    }
    if (/^\/api\/profiles\/[^/]+$/.test(path) && request.method === 'GET') {
      return await profileFor(requireUuid(path.split('/').pop()));
    }
    if (/^\/api\/posts\/[^/]+$/.test(path)) {
      const id = requireUuid(path.split('/').pop());
      const user = await userFor(request, db, false);
      const post = checked(await db.from('posts').select('*').eq('id',id).maybeSingle());
      if (!post) throw fail(404,'Post not found');
      return hydrate(post,user?.id === post.owner_id);
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
    const browsing = path === '/api/feed' || path === '/api/posts' || /^\/api\/(posts|profiles)\/[^/]+$/.test(path);
    const fileDownload = /^\/api\/files\/[^/]+$/.test(path);
    const imageRequest = /^\/api\/images\/[^/]+$/.test(path);
    const uploadRequest = request.method === 'POST' && path === '/api/uploads';
    const currentProfile = path === '/api/me/profile' && ['GET', 'POST'].includes(request.method);
    const postWrite = /^\/api\/posts\/[^/]+$/.test(path) && ['POST', 'DELETE'].includes(request.method);
    const draftDetail = request.method === 'GET' && /^\/api\/me\/drafts\/[^/]+$/.test(path);
    if (!draftDetail && !postWrite && !currentProfile && !uploadRequest && (request.method !== 'GET' || (!browsing && !imageRequest && !fileDownload && !['/api/categories', '/api/me/categories'].includes(path)))) {
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
      if (draftDetail) {
        const user = await userFor(request, db);
        const id = requireUuid(path.split('/')[4]);
        const row = checked(await db.from('drafts').select('*').eq('id', id).eq('owner_id', user.id).maybeSingle());
        if (!row) throw fail(404, 'Draft not found');
        const files = checked(await db.from('upload_sessions').select('*')
          .eq('draft_id', row.id).eq('owner_id', row.owner_id).eq('status', 'ready'));
        const byId = new Map(files.map(file => [file.id, file]));
        const payload = row.payload;
        if (!payload.draft) return json({ draft: null });
        const gallery = await Promise.all((payload.draft.gallery || []).filter(item => byId.has(item.id)).map(async item => {
          const file = byId.get(item.id);
          const src = file.bucket === 'showcase' || !file.provider
            ? db.storage.from('showcase').getPublicUrl(file.object_key).data.publicUrl
            : await uploadPreview(env, file.id);
          return { ...item, src };
        }));
        return json({ draft: {
          ...payload, id: row.owner_id + ':' + row.id, draftId: row.id, ownerId: row.owner_id,
          updatedAt: new Date(row.updated_at).getTime(), cloudVersion: row.version, synced: true,
          draft: { ...payload.draft, gallery, image: gallery[0]?.src || '' },
        } });
      }
      if (postWrite) {
        const id = requireUuid(path.split('/').pop());
        const user = await userFor(request, db);
        if (request.method === 'POST') {
          const body = await profileJson(request);
          const post = validatePost(body);
          checked(await db.rpc('save_post', {
            p_owner: user.id, p_id: id, p_version: body.version, p_post: post,
            p_images: body.images, p_attachments: body.attachments, p_links: body.externalDownloads,
          }));
          const response = json({ id });
          ctx.waitUntil(cleanupProfileUploads(db, env, user.id)
            .catch(() => console.error('Cleanup will retry on the next scheduled run')));
          return response;
        }
        checked(await db.rpc('delete_post', { p_owner: user.id, p_id: id }));
        await cleanupProfileUploads(db, env, user.id);
        return json({ deleted: true });
      }
      if (browsing || currentProfile) return json(await browse(request, db, env));
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
