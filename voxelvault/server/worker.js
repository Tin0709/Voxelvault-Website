import { createClient } from '@supabase/supabase-js';
import { requireUuid } from './validation.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const checked = ({ data, error }) => { if (error) throw error; return data; };

async function userFor(request, db) {
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw fail(401, 'Please sign in');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw fail(401, 'Session expired. Please sign in again.');
  return data.user;
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
        if (file.provider !== 'r2') throw fail(501, 'Supabase Storage downloads are not migrated yet.');
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
