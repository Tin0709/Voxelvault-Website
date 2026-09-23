import { useRef, useState } from 'react';
import Icon from '../ui/Icon';
function Thumbnail({image}) {
 const [status,setStatus]=useState('loading');
 return <><span className={`vv-thumb-placeholder ${status==='loading'?'vv-skeleton':''}`} aria-hidden="true">{status!=='ready'&&<Icon name="image"/>}</span><img src={image.src} alt="" loading="lazy" onLoad={()=>setStatus('ready')} onError={()=>setStatus('error')} className={`absolute inset-0 h-full w-full object-cover transition-opacity ${status==='ready'?'opacity-100':'opacity-0'}`}/></>;
}
export default function PostGallery({creation}) {
 const [activeIndex,setActiveIndex]=useState(0);
 const strip=useRef(null);
 const originals=creation.gallery?.length?creation.gallery:[{src:creation.image,alt:creation.alt}];
 const picked=originals.find(image=>image.id===creation.selectedImageId);
 const images=picked?[picked,...originals.filter(image=>image!==picked)]:originals;
 const index=Math.min(activeIndex,images.length-1);
 const active=images[index];
 function select(next){const value=(next+images.length)%images.length;setActiveIndex(value);const item=strip.current?.children[value];if(item)strip.current.scrollTo({left:item.offsetLeft-strip.current.offsetLeft-(strip.current.clientWidth-item.clientWidth)/2,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 return <section aria-label="Creation gallery" className="min-w-0" onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();select(index+(e.key==='ArrowLeft'?-1:1));}}}>
  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/25">
   <img src={active.src} alt={active.alt||creation.title} className="aspect-[16/10] w-full object-contain"/>
   <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs capitalize text-primary backdrop-blur-md">{creation.category}</span>
   {images.length>1&&<><button type="button" className="vv-gallery-arrow left-3" aria-label="Previous image" onClick={()=>select(index-1)}><Icon name="chevronRight" className="rotate-180"/></button><button type="button" className="vv-gallery-arrow right-3" aria-label="Next image" onClick={()=>select(index+1)}><Icon name="chevronRight"/></button></>}
   <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10"><span aria-live="polite" className="text-xs text-white">View {index+1} / {images.length}</span><a href={active.src} target="_blank" rel="noreferrer" className="rounded-full bg-black/60 px-3 py-2 text-xs text-white">Open original ↗</a></div>
  </div>
  {images.length>1&&<div className="rounded-b-2xl border border-t-0 border-white/10 bg-black/20 p-2"><div className="flex items-center justify-between px-2 pt-2 text-xs text-on-surface-variant"><span>{images.length} photos · Scroll to explore</span><span><button type="button" aria-label="Scroll thumbnails left" onClick={()=>strip.current?.scrollBy({left:-280,behavior:'smooth'})} className="px-3 py-2">←</button><button type="button" aria-label="Scroll thumbnails right" onClick={()=>strip.current?.scrollBy({left:280,behavior:'smooth'})} className="px-3 py-2">→</button></span></div><div ref={strip} className="vault-filmstrip relative">{images.map((image,i)=><button key={`${image.src}-${i}`} type="button" onClick={()=>select(i)} aria-label={`Show image ${i+1}`} aria-pressed={i===index} className={`relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl border-2 sm:w-36 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${i===index?'border-primary':'border-transparent opacity-60'}`}><Thumbnail image={image}/></button>)}</div></div>}
 </section>;
}
