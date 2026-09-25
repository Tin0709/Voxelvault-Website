import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import ExploreCard,{CardSkeleton} from './ExploreCard';
export default function ExploreGrid({creations=[],onCreationClick,loading=false,loadingMore=false,rowOrder=false}){
 const grid=useRef(null);
 const [columns,setColumns]=useState(()=>window.innerWidth>=1280?4:window.innerWidth>=1024?3:window.innerWidth>=640?2:1);
 useEffect(()=>{const resize=()=>setColumns(window.innerWidth>=1280?4:window.innerWidth>=1024?3:window.innerWidth>=640?2:1);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 // Reserve exactly the last card's hidden details in each masonry column.
 // As it opens, consume that space so the grid/footer stay at the same height.
 useLayoutEffect(()=>{
  if(loading||loadingMore||rowOrder||!grid.current)return;
  const cleanups=[...grid.current.children].map(column=>{
   const details=column.lastElementChild?.querySelector('.vv-card-details');
   const content=details?.firstElementChild?.firstElementChild;
   if(!content)return ()=>{};
   const reserve=()=>{column.style.paddingBottom=`${Math.max(0,content.getBoundingClientRect().height-details.getBoundingClientRect().height)}px`;};
   reserve();
   const observer=new ResizeObserver(reserve);observer.observe(content);observer.observe(details);
   return ()=>{observer.disconnect();column.style.removeProperty('padding-bottom');};
  });
  return ()=>cleanups.forEach(cleanup=>cleanup());
 },[creations,columns,loading,loadingMore,rowOrder]);
 if(rowOrder)return <div className="vv-portfolio-grid grid items-start gap-5" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}}>{creations.map(creation=><ExploreCard key={creation.id} creation={creation} onOpen={onCreationClick}/>)}{(loading||loadingMore)&&Array.from({length:columns*2},(_,i)=><CardSkeleton key={i}/>)}</div>;
 if(!loading&&!creations.length)return <p className="py-16 text-center text-on-surface-variant">No matching images. Try another category or keyword.</p>;
 return <div ref={grid} className="grid items-start gap-5" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}} aria-busy={loading||loadingMore}>{Array.from({length:columns},(_,column)=><div key={column} className="flex min-w-0 flex-col gap-5">{loading?Array.from({length:2},(_,i)=><CardSkeleton key={i}/>):creations.filter((_,i)=>i%columns===column).map(creation=><ExploreCard key={creation.id} creation={creation} onOpen={onCreationClick}/>)}{loadingMore&&Array.from({length:2},(_,i)=><CardSkeleton key={`more-${i}`}/>)}</div>)}</div>;
}
