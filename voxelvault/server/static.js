import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {pipeline} from 'node:stream/promises';

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.txt':'text/plain; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json'};

// Only the compiled public directory is served, never the repository or environment files.
export async function serveStatic(req,res,directory,pathname){
  const sendError=status=>{res.writeHead(status,{'Cache-Control':'no-store'});res.end();};
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');sendError(405);return;}
  let decoded;
  try{decoded=decodeURIComponent(pathname);}catch{sendError(400);return;}
  if(decoded.includes('\\')||decoded.includes('\0')||decoded.split('/').some(part=>part.startsWith('.'))){sendError(404);return;}
  const root=resolve(directory);
  let file=resolve(root,'.'+decoded);
  if(file!==root&&!file.startsWith(root+sep)){sendError(404);return;}
  let info=await stat(file).catch(()=>null);
  if(!info?.isFile()){
    if(extname(decoded)||decoded.startsWith('/assets/')||!req.headers.accept?.includes('text/html')){sendError(404);return;}
    file=resolve(root,'index.html');info=await stat(file).catch(()=>null);
  }
  if(!info?.isFile()){sendError(503);return;}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':info.size,
    'Cache-Control':decoded.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY'});
  if(req.method==='HEAD'){res.end();return;}
  await pipeline(createReadStream(file),res);
}
