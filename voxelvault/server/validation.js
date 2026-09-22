export const MAX_BYTES = 50_000_000;
export const SMALL_BYTES = 5_000_000;
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function requireUuid(value) {
  if (!uuidPattern.test(value ?? '')) throw Object.assign(new Error('Invalid ID'), { status: 400 });
  return value;
}
export function storageFor(kind, size) {
  if (!['image', 'attachment'].includes(kind) || !Number.isSafeInteger(size) || size < 0 || size > MAX_BYTES) {
    throw Object.assign(new Error('Files must be at most 50 MB'), { status: 400 });
  }
  return kind === 'image' || size <= SMALL_BYTES ? 'supabase' : 'r2';
}
export function httpUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}
export function validatePost(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('Invalid post'), { status: 400 });
  const limits = { title: 120, description: 20000, category: 80, location: 200, minecraftVersion: 100, revisionNotes: 5000, originalCreator: 200, originalSource: 200, creditUrl: 2048 };
  const post = {};
  for (const [key, max] of Object.entries(limits)) {
    if (body[key] !== undefined && typeof body[key] !== 'string') throw Object.assign(new Error(`Invalid ${key}`), { status: 400 });
    post[key] = (body[key] ?? '').trim();
    if (post[key].length > max) throw Object.assign(new Error(`${key} is too long`), { status: 400 });
  }
  if (!post.title || !post.category || (post.creditUrl && !httpUrl(post.creditUrl))) throw Object.assign(new Error('Invalid post title, category or credit URL'), { status: 400 });
  if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 30 || !Array.isArray(body.attachments) || body.attachments.length > 50 || !Array.isArray(body.externalDownloads) || body.externalDownloads.length > 50) throw Object.assign(new Error('Invalid images, attachments or links'), { status: 400 });
  const ids = [...body.images, ...body.attachments].map((item) => requireUuid(item?.id));
  if (new Set(ids).size !== ids.length) throw Object.assign(new Error('Duplicate file'), { status: 400 });
  for (const link of body.externalDownloads) {
    if (typeof link?.name !== 'string' || !link.name.trim() || link.name.length > 120 || typeof link.url !== 'string' || link.url.length > 4096 || !httpUrl(link.url)) throw Object.assign(new Error('Invalid external download link'), { status: 400 });
  }
  if (!Number.isInteger(body.version) || body.version < 0) throw Object.assign(new Error('Invalid post version'), { status: 400 });
  return post;
}
