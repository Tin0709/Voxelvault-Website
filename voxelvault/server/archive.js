import { ZipArchive } from 'archiver';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export function safeFilename(value, fallback='file') {
  // Control characters must not appear in ZIP entry names or download headers.
  // eslint-disable-next-line no-control-regex
  const result=String(value ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g,'-').replace(/^\.+|[. ]+$/g,'').trim().slice(0,140);
  return result || fallback;
}
export function archiveNames(files) {
  const used=new Set();
  return files.map(file=>{
    const base=safeFilename(file.original_name);
    const dot=base.lastIndexOf('.');
    const stem=dot>0?base.slice(0,dot):base;
    const ext=dot>0?base.slice(dot):'';
    let name=base,n=2;
    while(used.has(name.toLowerCase()))name=`${stem} (${n++})${ext}`;
    used.add(name.toLowerCase());return name;
  });
}
export async function streamArchive(res, files, openFile) {
  const archive=new ZipArchive({store:true});
  const streams=[];
  archive.on('warning',error=>archive.destroy(error));
  const names=archiveNames(files);
  for(const [i,file] of files.entries()) {
    // Open each object only when archiver consumes it, keeping memory bounded.
    const stream=Readable.from((async function*(){
      const source=await openFile(file);
      try { for await (const chunk of source) yield chunk; }
      finally { source.destroy?.(); }
    })());
    streams.push(stream);
    stream.on('error',error=>archive.destroy(error));
    archive.append(stream,{name:names[i]});
  }
  try { await Promise.all([pipeline(archive,res),archive.finalize()]); }
  finally { streams.forEach(stream=>stream.destroy());archive.abort(); }
}
