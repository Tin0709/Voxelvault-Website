import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export const authProviders = (import.meta.env.VITE_AUTH_PROVIDERS ?? '').split(',').map((p) => p.trim()).filter((p) => ['google','facebook','github','discord','azure'].includes(p));
