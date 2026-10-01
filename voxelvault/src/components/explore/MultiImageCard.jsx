import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import Icon from '../ui/Icon';
import {CardSkeleton} from './ExploreCard';

export function previewImages(creation){
 const images=creation.previewImages||creation.gallery||[];
 const first=creation.imageId?{id:creation.imageId,src:creation.image,alt:creation.alt}:null;
 return [...(first?[first]:[]),...images].filter((image,index,all)=>image.id&&image.src&&all.findIndex(other=>other.id===image.id)===index).slice(0,5);
}
const touchQuery='(hover: none), (pointer: coarse), (any-pointer: coarse)';
export default function MultiImageCard({creation,onOpen,touchTitle=false}){
 const images=previewImages(creation);
 const [index,setIndex]=useState(0);
 const [loaded,setLoaded]=useState({});
 const [transition,setTransition]=useState(null);
 const moving=useRef(null);
 const timer=useRef(null);
 const track=useRef(null),scrollFrame=useRef(null),activeIndex=useRef(index);
 const scrollStart=useRef(null),suppressClick=useRef(false);
 const [touch,setTouch]=useState(()=>window.matchMedia(touchQuery).matches);
 activeIndex.current=index;
 useEffect(()=>{
  const media=window.matchMedia(touchQuery);
  const change=()=>{clearTimeout(timer.current);moving.current=null;setTransition(null);setTouch(media.matches);};
  media.addEventListener('change',change);
  return()=>media.removeEventListener('change',change);
 },[]);
 const active=images[index%images.length];
 function finish(){
  const next=moving.current;
  if(!next)return;
  clearTimeout(timer.current);
  setIndex(next.to);setTransition(null);moving.current=null;
 }
 useEffect(()=>{
  if(!transition)return;
  // Also settle if animationend is interrupted (for example in a background tab).
  timer.current=setTimeout(finish,380);
  return()=>clearTimeout(timer.current);
 },[transition]);
 // Resize only: retain the selected image without driving native finger movement.
 useLayoutEffect(()=>{
  if(!touch||!track.current)return;
  const node=track.current;
  let width=0;
  const align=()=>{
   if(node.clientWidth===width)return;
   width=node.clientWidth;
   node.scrollTo({left:activeIndex.current*width,behavior:'instant'});
  };
  align();
  const observer=new ResizeObserver(align);observer.observe(node);
  return()=>{observer.disconnect();cancelAnimationFrame(scrollFrame.current);scrollFrame.current=null;};
 },[touch]);
 function observeScroll(){
  if(scrollFrame.current!==null)return;
  scrollFrame.current=requestAnimationFrame(()=>{
   scrollFrame.current=null;
   const node=track.current;
   if(!node||!node.clientWidth)return;
   if(scrollStart.current!==null&&Math.abs(node.scrollLeft-scrollStart.current)>6)suppressClick.current=true;
   const next=Math.max(0,Math.min(images.length-1,Math.round(node.scrollLeft/node.clientWidth)));
   if(next!==activeIndex.current){activeIndex.current=next;setIndex(next);}
  });
 }
 function move(direction){
  if(moving.current||images.length<2)return;
  const to=(index+direction+images.length)%images.length;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setIndex(to);return;}
  const next={from:index,to,direction};
  moving.current=next;setTransition(next);
 }
 function open(imageId=active.id){if(!moving.current)onOpen({...creation,postId:creation.postId||creation.id,imageId});}
 const slides=touch?images.map((_,i)=>i):transition?[transition.from,transition.to]:[index%images.length];
 const indicatorIndex=transition?.to??index;
 const pagination=<span className="vv-multi-position" role="status" aria-label={`Image ${indicatorIndex+1} of ${images.length}`}>{images.map((image,i)=><i key={image.id} data-active={i===indicatorIndex}/>)}</span>;
 return <article data-card-id={creation.id} data-touch-title={touchTitle} className="vv-explore-card vv-multi-card" data-native-scroll={touch}>
  <div className="vv-multi-media" aria-busy={Boolean(transition)} style={{'--slide-direction':transition?.direction||1}}
   onPointerDown={()=>{suppressClick.current=false;scrollStart.current=touch?track.current?.scrollLeft:null;}}
   onPointerCancel={()=>{suppressClick.current=true;}}
   onClickCapture={e=>{
    const scrolled=touch&&scrollStart.current!==null&&Math.abs((track.current?.scrollLeft||0)-scrollStart.current)>6;
    if(suppressClick.current||scrolled||moving.current){e.preventDefault();e.stopPropagation();suppressClick.current=false;scrollStart.current=null;}
   }}>
   <div className={'vv-multi-track'+(touch?' vv-multi-native':'')} ref={track} onScroll={touch?observeScroll:undefined}>
   {slides.map(slideIndex=>{
    const image=images[slideIndex],state=loaded[image.id]||'loading';
    const incoming=Boolean(transition&&slideIndex===transition.to);
    return <a key={image.id} className={'vv-multi-slide'+(transition?(incoming?' vv-multi-slide-in':' vv-multi-slide-out'):'')} href={`/creations/${encodeURIComponent(creation.postId||creation.id)}?image=${encodeURIComponent(image.id)}`} tabIndex={transition||slideIndex!==index?-1:0} aria-hidden={slideIndex!==index} onAnimationEnd={e=>{if(incoming&&e.target===e.currentTarget)finish();}} onClick={e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();open(image.id);}}} aria-label={`Open ${creation.title}, image ${slideIndex+1}`} draggable={false}>
     {state==='loading'&&<CardSkeleton mediaOnly/>}
     {state==='error'?<span className="vv-multi-error">Image unavailable</span>:<img src={image.src} alt={image.alt||creation.title} loading={Math.abs(slideIndex-index)===1?'eager':'lazy'} draggable={false} onLoad={()=>setLoaded(current=>({...current,[image.id]:'ready'}))} onError={()=>setLoaded(current=>({...current,[image.id]:'error'}))} style={{opacity:state==='ready'?1:0}}/>}
    </a>;
   })}
   </div>
   <span className="vv-card-category">{creation.category}</span>
   {!touch&&<><button type="button" className="vv-multi-arrow vv-multi-prev" onClick={()=>move(-1)} aria-label="Previous card image"><Icon name="chevronRight" className="rotate-180"/></button>
   <button type="button" className="vv-multi-arrow vv-multi-next" onClick={()=>move(1)} aria-label="Next card image"><Icon name="chevronRight"/></button></>}
   {pagination}
  </div>
  <div className="vv-multi-touch-position">{pagination}</div>
  <button type="button" className="vv-multi-caption w-full p-4 text-left" onClick={()=>open()}>
   <h2 className="break-words font-headline-lg text-lg leading-snug">{creation.title}</h2>
   <span className="vv-card-creator mt-3 flex items-center gap-2 text-xs text-on-surface-variant">{creation.creatorAvatar?<img src={creation.creatorAvatar} alt="" className="h-7 w-7 rounded-full object-cover"/>:<span>{creation.creator?.slice(0,1)}</span>}<span>{creation.creator}</span></span>
  </button>
 </article>;
}
