import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import { MAX_BYTES, requireUuid, storageFor, validatePost } from './validation.js';
import { streamArchive, safeFilename } from './archive.js';
import { storageReport } from './storage-report.js';

export function createApi({ db = null, r2 = null, env = {} } = {}) {
const configured = Boolean(db);
const fail = (status, message) => Object.assign(new Error(message), { status });
const checked = ({ data, error }) => { if (error) throw error; return data; };
const allowedOrigin = env.APP_ORIGIN || 'http://localhost:5173';

async function userFor(req, required = false) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) { if (required) throw fail(401, 'Please sign in'); return null; }
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw fail(401, 'Session expired. Please sign in again.');
  return data.user;
}
async function readBody(req, max) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw fail(413, 'Request is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function jsonBody(req) {
  try { return JSON.parse((await readBody(req, 300000)).toString()); }
  catch (error) { if (error.status) throw error; throw fail(400, 'Invalid JSON'); }
}
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
function publicImage(file) {
  return db.storage.from('showcase').getPublicUrl(file.object_key).data.publicUrl;
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
    const file = checked(await db.from('upload_sessions').select('object_key').eq('id',profile.cover_upload_id).single());
    coverUrl = publicImage(file);
  }
  if (profile.avatar_upload_id) {
    const file = checked(await db.from('upload_sessions').select('object_key').eq('id',profile.avatar_upload_id).single());
    avatarUrl = publicImage(file);
  }
  return { id:profile.id, name:profile.name, bio:profile.bio, country:profile.country, version:profile.version,
    avatarId:profile.avatar_upload_id, avatarUrl, coverId:profile.cover_upload_id, coverUrl, handle:profile.id.slice(0,8), initials:profile.name.slice(0,2).toUpperCase() };
}

async function removeObject(file) {
  if (file.provider === 'r2') {
    if (!r2) throw fail(503, 'R2 is not configured');
    await r2.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: file.object_key }));
  } else checked(await db.storage.from(file.bucket).remove([file.object_key]));
  checked(await db.from('upload_sessions').delete().eq('id', file.id).eq('status', 'deleting'));
}
async function cleanup(ownerId) {
  const files = checked(await db.rpc('claim_cleanup', { p_owner: ownerId }));
  for (const file of files) {
    try { await removeObject(file); } catch { console.error(`Cleanup pending for upload ${file.id}`); }
  }
}

// A small per-process concurrency limit keeps bounded upload buffering from exhausting memory.
let activeUploads = 0;
let activeArchives = 0;
async function upload(req, res, user, url) {
  if (activeUploads >= 4) throw fail(429, 'Server busy. Please retry this file.');
  const size = Number(req.headers['content-length']);
  const kind = url.searchParams.get('kind');
  const provider = storageFor(kind, size);
  const name = (url.searchParams.get('name') ?? '').trim();
  if (!name || name.length > 255) throw fail(400, 'Invalid filename');
  if (provider === 'r2' && !r2) throw fail(503, 'R2 is not configured yet');
  activeUploads++;
  let record;
  try {
    record = checked(await db.rpc('reserve_upload', { p_owner: user.id, p_id: randomUUID(), p_name: name, p_mime: 'application/octet-stream', p_size: size, p_kind: kind }));
    const bytes = await readBody(req, MAX_BYTES);
    if (bytes.length !== size) throw fail(400, 'File size does not match');
    const detected = await fileTypeFromBuffer(bytes).catch(() => null);
    const mime = detected?.mime ?? 'application/octet-stream';
    if (kind === 'image' && !['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(mime)) throw fail(400, 'Invalid or unsupported image');
    if (provider === 'r2') {
      await r2.send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: record.object_key, Body: bytes, ContentLength: size, ContentType: mime }));
      const head = await r2.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: record.object_key }));
      if (head.ContentLength !== size) throw fail(502, 'Stored size verification failed');
    } else {
      checked(await db.storage.from(record.bucket).upload(record.object_key, bytes, { contentType: mime, upsert: false }));
      const info = checked(await db.storage.from(record.bucket).info(record.object_key));
      if (Number(info.metadata?.size ?? info.size) !== size) throw fail(502, 'Stored size verification failed');
    }
    checked(await db.from('upload_sessions').update({ status: 'ready', mime_type: mime }).eq('id', record.id).eq('status', 'pending').select().single());
    json(res, 201, { id: record.id, originalName: name, sizeBytes: size, mimeType: mime, typeLabel: mime, status: 'ready', provider, ...(kind === 'image' ? { src: publicImage(record), alt: name } : {}) });
  } catch (error) {
    if (record) {
      await db.from('upload_sessions').update({ status: 'deleting' }).eq('id', record.id);
      try { await removeObject(record); } catch { /* Durable row is retried by cleanup. */ }
    }
    throw error;
  } finally { activeUploads--; }
}

const server = http.createServer(async (req, res) => {
  try {
    const origin = req.headers.origin;
    if (origin && origin !== allowedOrigin) throw fail(403, 'Origin not allowed');
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Expose-Headers','Content-Disposition'); res.setHeader('Vary','Origin'); }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');
      res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
      res.writeHead(204); res.end(); return;
    }
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    if (path === '/api/health') { json(res,200,{ configured, r2Configured: Boolean(r2) }); return; }
    if (!db) throw fail(503, 'Backend not configured. Follow docs/BACKEND_SETUP.md.');
    if (path === '/api/feed' && req.method === 'GET') {
      const seed=requireUuid(url.searchParams.get('seed'));
      const after=url.searchParams.get('after')||'';
      const category=url.searchParams.get('category')||'';
      const search=url.searchParams.get('search')||'';
      if(after.length>80||category.length>80||search.length>200)throw fail(400,'Invalid feed request');
      const rows=checked(await db.rpc('image_feed',{p_seed:seed,p_after:after,p_category:category,p_search:search,p_limit:31}));
      const page=rows.slice(0,30);
      json(res,200,{items:page.map(row=>({id:row.image_id,postId:row.post_id,imageId:row.image_id,title:row.title,category:row.category,creator:row.creator,creatorId:row.creator_id,image:publicImage(row),alt:row.alt,creatorAvatar:row.avatar_key?publicImage({object_key:row.avatar_key}):''})),next:rows.length>30?page.at(-1).sort_key:null});return;
    }
    if (path === '/api/categories' && req.method === 'GET') {
      const categories=new Set();
      for(let offset=0;;offset+=1000){const rows=checked(await db.from('posts').select('category').order('id').range(offset,offset+999));rows.forEach(row=>categories.add(row.category));if(rows.length<1000)break;}
      json(res,200,{categories:[...categories].sort()});return;
    }
    if (path === '/api/posts' && req.method === 'GET') {
      const mine = url.searchParams.get('mine') === 'true';
      const user = await userFor(req, mine);
      let query = db.from('posts').select('*').order('created_at', { ascending: false });
      if (mine) query = query.eq('owner_id', user.id);
      if (url.searchParams.has('creator')) query = query.eq('owner_id', requireUuid(url.searchParams.get('creator')));
      const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
      const posts = checked(await query.range(offset, offset + 49));
      json(res,200,{ posts: await Promise.all(posts.map((p) => hydrate(p, mine))), hasMore: posts.length === 50 }); return;
    }
    if (/^\/api\/profiles\/[^/]+$/.test(path) && req.method === 'GET') {
      json(res,200,await profileFor(requireUuid(path.split('/').pop()))); return;
    }
    if (path === '/api/me/profile' && ['GET','POST'].includes(req.method)) {
      const user = await userFor(req,true);
      if (req.method === 'POST') {
        const body = await jsonBody(req);
        if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length>50 || typeof body.bio !== 'string' || body.bio.length>1000 || typeof body.country !== 'string' || !/^([A-Z]{2})?$/.test(body.country) || !Number.isInteger(body.version) || body.version<0) throw fail(400,'Invalid profile');
        const avatar = body.avatarId === null ? null : requireUuid(body.avatarId);
        const cover = body.coverId == null ? (await profileFor(user.id)).coverId : requireUuid(body.coverId);
        checked(await db.rpc('save_profile',{p_owner:user.id,p_name:body.name.trim(),p_bio:body.bio,p_country:body.country,p_avatar:avatar,p_cover:body.coverId === null ? null : cover ?? null,p_version:body.version}));
        await cleanup(user.id);
      }
      json(res,200,{...await profileFor(user.id),email:user.email}); return;
    }
    if (path === '/api/me/storage/details' && req.method === 'GET') {
      const user = await userFor(req,true);
      const [profile,account]=await Promise.all([
        db.from('profiles').select('avatar_upload_id,cover_upload_id').eq('id',user.id).single().then(checked),
        db.from('storage_accounts').select('quota_bytes').eq('owner_id',user.id).single().then(checked),
      ]);
      const files=[];
      for(let offset=0;;offset+=1000){
        const rows=checked(await db.from('upload_sessions').select('id,original_name,size_bytes,kind,provider,status,post_id,created_at,object_key').eq('owner_id',user.id).order('id').range(offset,offset+999));
        files.push(...rows);if(rows.length<1000)break;
      }
      const report=storageReport(files,profile,account.quota_bytes);
      const byId=new Map(files.map(file=>[file.id,file]));
      report.items=report.items.map(item=>({...item,previewUrl:item.kind==='image'&&item.provider==='supabase'&&byId.get(item.id).status==='ready'?publicImage(byId.get(item.id)):null}));
      json(res,200,report);return;
    }
    if (/^\/api\/me\/storage\/uploads\/[^/]+$/.test(path) && req.method === 'DELETE') {
      const user=await userFor(req,true);
      const result=await db.rpc('claim_unused_upload',{p_owner:user.id,p_upload:requireUuid(path.split('/')[5])});
      if(result.error){
        if(result.error.code==='PGRST202')throw fail(503,'Apply migration 202609230005_unused_upload_deletion.sql to enable safe removal.');
        throw fail(409,result.error.message);
      }
      const file=result.data;
      try {await removeObject(file);}catch{throw fail(503,'Storage deletion is pending. Retry removal; quota is retained until deletion succeeds.');}
      json(res,200,{deleted:true});return;
    }
    if (path === '/api/me/storage' && req.method === 'GET') {
      const user = await userFor(req,true);
      json(res,200,checked(await db.rpc('storage_usage',{p_owner:user.id}))); return;
    }
    if (path === '/api/me/categories' && req.method === 'GET') {
      const user = await userFor(req,true);
      const categories = new Set();
      for (let offset=0;;offset+=1000) {
        const rows = checked(await db.from('posts').select('category').eq('owner_id',user.id).order('id').range(offset,offset+999));
        rows.forEach(row=>categories.add(row.category));
        if (rows.length<1000) break;
      }
      json(res,200,{categories:[...categories].sort()}); return;
    }
    if (path === '/api/uploads' && req.method === 'POST') { await upload(req,res,await userFor(req,true),url); return; }
    if (/^\/api\/posts\/[^/]+\/archive$/.test(path) && req.method === 'GET') {
      const user=await userFor(req,true);
      const post=checked(await db.from('posts').select('id,title').eq('id',requireUuid(path.split('/')[3])).eq('owner_id',user.id).maybeSingle());
      if(!post) throw fail(404,'Post not found');
      const files=checked(await db.from('upload_sessions').select('*').eq('post_id',post.id).eq('owner_id',user.id).eq('kind','attachment').eq('status','ready').order('id'));
      if(!files.length) throw fail(404,'No uploaded files to download');
      if(files.some(f=>f.provider==='r2')&&!r2) throw fail(503,'R2 not configured');
      if(activeArchives>=2) throw fail(429,'Archive service busy. Please try again.');
      activeArchives++;
      try {
        res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(safeFilename(post.title,'voxelvault-post')+'.zip')}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
        await streamArchive(res,files,async file=>{
          if(file.provider==='r2') return (await r2.send(new GetObjectCommand({Bucket:env.R2_BUCKET,Key:file.object_key}))).Body;
          return Readable.fromWeb(checked(await db.storage.from(file.bucket).download(file.object_key)).stream());
        });
      } finally {activeArchives--;}
      return;
    }
    if (/^\/api\/files\/[^/]+$/.test(path) && req.method === 'GET') {
      const user = await userFor(req,true);
      const file = checked(await db.from('upload_sessions').select('*').eq('id',requireUuid(path.split('/').pop())).eq('owner_id',user.id).eq('status','ready').maybeSingle());
      if (!file || !file.post_id || file.kind !== 'attachment') throw fail(404,'File not found');
      let stream;
      if (file.provider === 'r2') {
        if (!r2) throw fail(503,'R2 not configured');
        const object = await r2.send(new GetObjectCommand({Bucket:env.R2_BUCKET,Key:file.object_key}));
        stream = object.Body;
      } else {
        const blob = checked(await db.storage.from(file.bucket).download(file.object_key));
        stream = Readable.fromWeb(blob.stream());
      }
      res.writeHead(200, { 'Content-Type':'application/octet-stream', 'Content-Length':file.size_bytes, 'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(file.original_name)}`, 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff' });
      await pipeline(stream,res); return;
    }
    if (/^\/api\/posts\/[^/]+$/.test(path)) {
      const id = requireUuid(path.split('/').pop());
      const user = await userFor(req, req.method !== 'GET');
      if (req.method === 'GET') {
        const post = checked(await db.from('posts').select('*').eq('id',id).maybeSingle());
        if (!post) throw fail(404,'Post not found');
        json(res,200,await hydrate(post,user?.id === post.owner_id)); return;
      }
      if (req.method === 'POST') {
        const body = await jsonBody(req);
        const post = validatePost(body);
        checked(await db.rpc('save_post',{ p_owner:user.id,p_id:id,p_version:body.version,p_post:post,p_images:body.images,p_attachments:body.attachments,p_links:body.externalDownloads }));
        json(res,200,{id}); void cleanup(user.id).catch(()=>console.error('Cleanup will retry on the next scheduled run')); return;
      }
      if (req.method === 'DELETE') {
        checked(await db.rpc('delete_post',{p_owner:user.id,p_id:id}));
        await cleanup(user.id); json(res,200,{deleted:true}); return;
      }
    }
    throw fail(404,'Not found');
  } catch (error) {
    if (res.headersSent) { res.destroy(); return; }
    const expected = error.status || error.code === 'P0001';
    if (!expected) console.error('API operation failed:',error.code ?? error.name);
    json(res, error.status ?? (error.code === 'P0001' ? 409 : 500), { error: expected ? error.message : 'Backend request failed. Check configuration and database migration.' });
  }
});
server.requestTimeout = 300000;

return { server, cleanup };
}
