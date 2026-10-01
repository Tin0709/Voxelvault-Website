import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import Icon from '../ui/Icon';
import {CardSkeleton} from './ExploreCard';

export function previewImages(creation){
 const images=creation.previewImages||creation.gallery||[];
 const first=creation.imageId?{id:creation.imageId,src:creation.image,alt:creation.alt}:null;
 return [...(first?[first]:[]),...images].filter((image,index,all)=>image.id&&image.src&&all.findIndex(other=>other.id===image.id)===index).slice(0,5);
}
export default function MultiImageCard({creation,onOpen,touchTitle=false}){
 const images=previewImages(creation);
 const [index,setIndex]=useState(0);
 const [loaded,setLoaded]=useState({});
 const [transition,setTransition]=useState(null);
 const moving=useRef(null);
 const timer=useRef(null);
 const track=useRef(null);
 const gesture=useRef(null),suppressClick=useRef(false);
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
  timer.current=setTimeout(finish,transition.drag?260:380);
  return()=>clearTimeout(timer.current);
 },[transition]);
 // Rebase adjacent slides before paint; settling starts at the last pointer transform.
 useLayoutEffect(()=>{
  const node=track.current;
  if(!node)return;
  if(transition?.drag){
   node.style.transition=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'none':'transform 220ms cubic-bezier(.2,.7,.2,1)';
   node.style.transform=`translate3d(${-(transition.to-transition.from)*transition.width}px,0,0)`;
  }else{node.style.transition='none';node.style.transform='translate3d(0,0,0)';}
 },[index,transition]);
 function dragEnd(e,cancel=false){
  const g=gesture.current;
  if(!g||g.id!==e.pointerId)return;
  gesture.current=null;
  if(g.horizontal){
   if(g.touch){
    const dx=g.dx||0,velocity=e.timeStamp-g.time<100?g.velocity:0;
    const commit=!cancel&&(Math.abs(dx)>=g.width*.23||(Math.abs(dx)>12&&Math.abs(velocity)>.5&&Math.sign(velocity)===Math.sign(dx)));
    const to=commit?Math.max(0,Math.min(images.length-1,index+(dx<0?1:-1))):index;
    const next={from:index,to,drag:true,width:g.width};
    moving.current=next;setTransition(next);
   }else if(!cancel&&Math.abs(e.clientX-g.x)>35)move(e.clientX<g.x?1:-1);
  }
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 }
 function dragStart(e){
  if(e.button!==0||e.isPrimary===false)return;
  suppressClick.current=false;
  if(moving.current){suppressClick.current=true;return;}
  if(e.target.closest('.vv-multi-arrow'))return;
  gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,time:e.timeStamp,velocity:0,
   width:e.currentTarget.clientWidth,touch:e.pointerType!=='mouse'};
 }
 function dragMove(e){
  const g=gesture.current;
  if(!g||g.id!==e.pointerId)return;
  const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(!g.horizontal){
   if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)){gesture.current=null;suppressClick.current=true;return;}
   if(Math.abs(dx)<=8||Math.abs(dx)<=Math.abs(dy)*1.3)return;
   g.horizontal=true;e.currentTarget.setPointerCapture(e.pointerId);suppressClick.current=true;
  }
  const elapsed=e.timeStamp-g.time;
  if(elapsed>0)g.velocity=(e.clientX-g.lastX)/elapsed;
  g.lastX=e.clientX;g.time=e.timeStamp;g.dx=dx;
  // Transient movement stays outside React; width is measured once on pointer-down.
  if(g.touch&&track.current){
   const edge=(index===0&&dx>0)||(index===images.length-1&&dx<0);
   const offset=edge?Math.sign(dx)*g.width*.18*(1-Math.exp(-Math.abs(dx)/(g.width*.4))):Math.max(-g.width,Math.min(g.width,dx));
   track.current.style.transform=`translate3d(${offset}px,0,0)`;
  }
 }
 function move(direction){
  if(moving.current||images.length<2)return;
  const to=(index+direction+images.length)%images.length;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setIndex(to);return;}
  const next={from:index,to,direction};
  moving.current=next;setTransition(next);
 }
 function open(){if(!moving.current)onOpen({...creation,postId:creation.postId||creation.id,imageId:active.id});}
 const slides=transition&&!transition.drag?[transition.from,transition.to]:[index-1,index,index+1].filter(i=>i>=0&&i<images.length);
 const indicatorIndex=transition?.to??index;
 const pagination=<span className="vv-multi-position" role="status" aria-label={`Image ${indicatorIndex+1} of ${images.length}`}>{images.map((image,i)=><i key={image.id} data-active={i===indicatorIndex}/>)}</span>;
 return <article data-card-id={creation.id} data-touch-title={touchTitle} className="vv-explore-card vv-multi-card">
  <div className="vv-multi-media" aria-busy={Boolean(transition)} style={{touchAction:'pan-y','--slide-direction':transition?.direction||1}}
   onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={e=>dragEnd(e)}
   onPointerCancel={e=>{suppressClick.current=true;dragEnd(e,true);}}
   onLostPointerCapture={e=>dragEnd(e,true)}
   onClickCapture={e=>{if(suppressClick.current||moving.current){e.preventDefault();e.stopPropagation();suppressClick.current=false;}}}>
   <div className="vv-multi-track" ref={track} onTransitionEnd={e=>{if(transition?.drag&&e.target===e.currentTarget&&e.propertyName==='transform')finish();}}>
   {slides.map(slideIndex=>{
    const image=images[slideIndex],state=loaded[image.id]||'loading';
    const incoming=Boolean(transition&&!transition.drag&&slideIndex===transition.to);
    return <a key={image.id} className={'vv-multi-slide'+(transition&&!transition.drag?(incoming?' vv-multi-slide-in':' vv-multi-slide-out'):'')} style={transition&&!transition.drag?undefined:{transform:`translate3d(${(slideIndex-index)*100}%,0,0)`}} href={`/creations/${encodeURIComponent(creation.postId||creation.id)}?image=${encodeURIComponent(image.id)}`} tabIndex={transition||slideIndex!==index?-1:0} aria-hidden={slideIndex!==index} onAnimationEnd={e=>{if(incoming&&e.target===e.currentTarget)finish();}} onClick={e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();open();}}} aria-label={`Open ${creation.title}, image ${slideIndex+1}`} draggable={false}>
     {state==='loading'&&<CardSkeleton mediaOnly/>}
     {state==='error'?<span className="vv-multi-error">Image unavailable</span>:<img src={image.src} alt={image.alt||creation.title} loading={slideIndex!==index?'eager':'lazy'} draggable={false} onLoad={()=>setLoaded(current=>({...current,[image.id]:'ready'}))} onError={()=>setLoaded(current=>({...current,[image.id]:'error'}))} style={{opacity:state==='ready'?1:0}}/>}
    </a>;
   })}
   </div>
   <span className="vv-card-category">{creation.category}</span>
   <button type="button" className="vv-multi-arrow vv-multi-prev" onClick={()=>move(-1)} aria-label="Previous card image"><Icon name="chevronRight" className="rotate-180"/></button>
   <button type="button" className="vv-multi-arrow vv-multi-next" onClick={()=>move(1)} aria-label="Next card image"><Icon name="chevronRight"/></button>
   {pagination}
  </div>
  <div className="vv-multi-touch-position">{pagination}</div>
  <button type="button" className="vv-multi-caption w-full p-4 text-left" onClick={open}>
   <h2 className="break-words font-headline-lg text-lg leading-snug">{creation.title}</h2>
   <span className="vv-card-creator mt-3 flex items-center gap-2 text-xs text-on-surface-variant">{creation.creatorAvatar?<img src={creation.creatorAvatar} alt="" className="h-7 w-7 rounded-full object-cover"/>:<span>{creation.creator?.slice(0,1)}</span>}<span>{creation.creator}</span></span>
  </button>
 </article>;
}
