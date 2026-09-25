import { supabase } from './supabase';
import { notify } from './notifications';
import { exceedsImageLimit } from '../utils/attachments';
const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function headers() {
  if (!supabase) return {};
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}
export async function api(path, options = {}) {
  const response = await fetch(`${base}/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...await headers(), ...options.headers } }).catch(error=>{
    if (options.method && options.method !== 'GET' && error.name !== 'AbortError') notify('Check your connection and try again.','error');
    throw error;
  });
  const body = await response.json().catch(() => ({ error: 'API unavailable. Start the backend server.' }));
  if (!response.ok) {
    if (options.method && options.method !== 'GET') notify(body.error || 'Request failed','error');
    throw Object.assign(new Error(body.error || 'Request failed'),{status:response.status});
  }
  if (options.method === 'DELETE' && path.startsWith('/posts/')) notify('The post and its files have been removed.','success','Post deleted');
  if (options.method === 'POST' && path.startsWith('/posts/')) notify('Your changes are saved and your post is ready to view.','success','Post saved');
  if (options.method === 'POST' && path === '/me/profile') notify('Your profile changes have been saved.','success','Profile updated');
  return body;
}
export async function uploadFile(file, kind, onProgress, {silent=false,draftId} = {}) {
  if(kind==='image'&&exceedsImageLimit(file))throw new Error('Images must be smaller than 5 MB. Remove this image and select a smaller file.');
  const authHeaders = await headers();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/api/uploads?kind=${kind}&name=${encodeURIComponent(file.name)}${draftId?"&draft="+encodeURIComponent(draftId):""}`);
    for (const [key,value] of Object.entries(authHeaders)) xhr.setRequestHeader(key,value);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.timeout = 300000;
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    xhr.onerror = () => {notify('Upload failed. Check your connection and retry.','error');reject(new Error('Upload failed. Check your connection and retry.'));};
    xhr.ontimeout = () => {notify('Upload timed out. Retry this file.','error');reject(new Error('Upload timed out. Retry this file.'));};
    xhr.onload = () => {
      let body; try { body = JSON.parse(xhr.responseText); } catch { reject(new Error('Upload service unavailable')); return; }
      if (xhr.status >= 200 && xhr.status < 300) {if(!silent)notify(`${file.name} is stored successfully.`,'success','Upload complete');resolve(body);}
      else {notify(body.error || 'Upload failed','error');reject(new Error(body.error || 'Upload failed'));}
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
  notify(`${file.originalName} has been sent to your browser.`,'success','Download ready');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function downloadArchive(post) {
  notify('Preparing all uploaded attachments. External links stay on their original service.','info','Building your ZIP');
  const response=await fetch(`${base}/api/posts/${encodeURIComponent(post.id)}/archive`,{headers:await headers()});
  if(!response.ok) throw new Error((await response.json()).error || 'Archive download failed');
  const blob=await response.blob();
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;
  const encoded=response.headers.get('content-disposition')?.match(/filename\*=UTF-8''(.+)$/)?.[1];
  link.download=encoded?decodeURIComponent(encoded):'voxelvault-post.zip';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  notify('Your ZIP has been sent to the browser.','success','Archive ready');
}
