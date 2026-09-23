const paths = {
  search:'M21 21l-6-6 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M15 6l-2 7-4 5 2-7z',
  logout:'M10 17v3H3V4h7v3 M8 12h13m-4-4 4 4-4 4',
  image:'M4 4h16v16H4z M4 16l5-5 4 4 3-3 4 4 M8 8h.01',
  user:'M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  download:'M12 3v12m-5-5 5 5 5-5 M4 16v5h16v-5',
  upload:'M12 16V4m-5 5 5-5 5 5 M4 16v5h16v-5',
  archive:'M4 4h16v4H4z M5 8v13h14V8 M10 12h4',
  file:'M6 3h8l4 4v14H6z M14 3v5h4 M9 13h6 M9 17h4',
  cube:'m12 3 9 5v9l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v9',
  code:'m8 7-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',
  music:'M9 18V5l11-2v13 M9 16c-6-2-7 5-2 5 2 0 2-1 2-3 M20 14c-6-2-7 5-2 5 2 0 2-1 2-3',
  video:'M3 5h14v14H3z M17 9l5-3v12l-5-3',
  edit:'m15 4 5 5 M4 20l5-1L21 7l-5-5L4 14z',
  plus:'M12 5v14 M5 12h14',
  check:'m5 12 4 4L19 6',
  close:'m6 6 12 12 M6 18 18 6',
  link:'m10 13 4-4 M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0 M16 8l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
  lock:'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  save:'M4 3h13l3 3v15H4z M8 3v6h8V3 M8 21v-7h8v7',
  globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3c-5 5-5 13 0 18 5-5 5-13 0-18',
  grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  arrow:'M19 12H5m6-6-6 6 6 6',
  trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 11v6 M12 7h.01',
  mail:'M3 5h18v14H3z M3 5l9 8 9-8',
};
export default function Icon({ name='file', className='' }) {
  return <svg className={`inline-block h-5 w-5 shrink-0 align-middle ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.file}/></svg>;
}
export function FileIcon({ name='' }) {
  const ext=name.split('.').pop().toLowerCase();
  const icon = /^(zip|rar|7z|tar|gz)$/.test(ext)?'archive':/^(schem|schematic|litematic|mcworld|obj|fbx|glb|gltf|blend)$/.test(ext)?'cube':/^(jpg|jpeg|png|gif|webp|avif|svg)$/.test(ext)?'image':/^(mp4|mov|webm)$/.test(ext)?'video':/^(mp3|wav|ogg|flac)$/.test(ext)?'music':/^(js|json|py|html|css|xml)$/.test(ext)?'code':'file';
  return <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon name={icon}/></span>;
}
