import {useRef,useState} from 'react';
import Icon from '../ui/Icon';
import {CardSkeleton} from './ExploreCard';

export function previewImages(creation){
 const images=creation.previewImages||creation.gallery||[];
 const first=creation.imageId?{id:creation.imageId,src:creation.image,alt:creation.alt}:null;
 return [...(first?[first]:[]),...images].filter((image,index,all)=>image.id&&image.src&&all.findIndex(other=>other.id===image.id)===index).slice(0,5);
}
export function isMultiCard(creation,seed){
 if(previewImages(creation).length<2)return false;
 let hash=2166136261;
 for(const char of `${seed}:${creation.postId||creation.id}`)hash=Math.imul(hash^char.charCodeAt(0),16777619);
 return (hash>>>0)%4===0;
}
export default function MultiImageCard({creation,onOpen}){
 const images=previewImages(creation);
 const [index,setIndex]=useState(0);
 const [loaded,setLoaded]=useState({});
 const gesture=useRef(null),suppressClick=useRef(false);
 const active=images[index%images.length];
 const state=loaded[active.id]||'loading';
 function move(direction){setIndex(current=>(current+direction+images.length)%images.length);}
 function open(){onOpen({...creation,postId:creation.postId||creation.id,imageId:active.id});}
 return <article data-card-id={creation.id} className="vv-explore-card vv-multi-card">
  <div className="vv-multi-media" style={{touchAction:'pan-y'}}
   onPointerDown={e=>{if(e.button!==0||e.target.closest('.vv-multi-arrow'))return;suppressClick.current=false;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY};}}
   onPointerMove={e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){gesture.current=null;return;}if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.3){g.horizontal=true;e.currentTarget.setPointerCapture(e.pointerId);suppressClick.current=true;}}}
   onPointerUp={e=>{const g=gesture.current;gesture.current=null;if(g?.horizontal&&Math.abs(e.clientX-g.x)>35)move(e.clientX<g.x?1:-1);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
   onPointerCancel={()=>{gesture.current=null;suppressClick.current=true;}}
   onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();suppressClick.current=false;}}}>
   <a href={`/creations/${encodeURIComponent(creation.postId||creation.id)}?image=${encodeURIComponent(active.id)}`} onClick={e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();open();}}} aria-label={`Open ${creation.title}, image ${index+1}`} draggable={false}>
    {state==='loading'&&<CardSkeleton mediaOnly/>}
    {state==='error'?<span className="vv-multi-error">Image unavailable</span>:<img key={active.id} src={active.src} alt={active.alt||creation.title} loading="lazy" draggable={false} onLoad={()=>setLoaded(current=>({...current,[active.id]:'ready'}))} onError={()=>setLoaded(current=>({...current,[active.id]:'error'}))} style={{opacity:state==='ready'?1:0}}/>}
   </a>
   <span className="vv-card-category">{creation.category}</span>
   <button type="button" className="vv-multi-arrow vv-multi-prev" onClick={()=>move(-1)} aria-label="Previous card image"><Icon name="chevronRight" className="rotate-180"/></button>
   <button type="button" className="vv-multi-arrow vv-multi-next" onClick={()=>move(1)} aria-label="Next card image"><Icon name="chevronRight"/></button>
   <span className="vv-multi-position" role="status" aria-label={`Image ${index+1} of ${images.length}`}>{images.map((image,i)=><i key={image.id} data-active={i===index}/>)}</span>
  </div>
  <button type="button" className="vv-multi-caption w-full p-4 text-left" onClick={open}>
   <h2 className="break-words font-headline-lg text-lg leading-snug">{creation.title}</h2>
   <span className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant">{creation.creatorAvatar?<img src={creation.creatorAvatar} alt="" className="h-7 w-7 rounded-full object-cover"/>:<span>{creation.creator?.slice(0,1)}</span>}<span>{creation.creator}</span></span>
  </button>
 </article>;
}
