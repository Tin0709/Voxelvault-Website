import { supabase } from './supabase';
const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function headers() {
  if (!supabase) return {};
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}
export async function api(path, options = {}) {
  const response = await fetch(`${base}/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...await headers(), ...options.headers } });
  const body = await response.json().catch(() => ({ error: 'API unavailable. Start the backend server.' }));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}
export async function uploadFile(file, kind, onProgress) {
  const authHeaders = await headers();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/api/uploads?kind=${kind}&name=${encodeURIComponent(file.name)}`);
    for (const [key,value] of Object.entries(authHeaders)) xhr.setRequestHeader(key,value);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.timeout = 300000;
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and retry.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Retry this file.'));
    xhr.onload = () => {
      let body; try { body = JSON.parse(xhr.responseText); } catch { reject(new Error('Upload service unavailable')); return; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.error || 'Upload failed'));
    };
    xhr.send(file);
  });
}
export async function downloadFile(file) {
  const response = await fetch(`${base}/api/files/${encodeURIComponent(file.id)}`, { headers: await headers() });
  if (!response.ok) throw new Error((await response.json()).error || 'Download failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = file.originalName; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
