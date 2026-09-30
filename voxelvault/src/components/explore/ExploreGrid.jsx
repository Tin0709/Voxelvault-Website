import MultiImageCard,{isMultiCard} from './MultiImageCard';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import ExploreCard,{CardSkeleton} from './ExploreCard';
// Stable across image loads and carousel updates; shared by both card types.
export function showTouchTitle(creation,seed){
 let hash=2166136261;
 for(const char of `title:${seed}:${creation.postId||creation.id}`)hash=Math.imul(hash^char.charCodeAt(0),16777619);
 return (hash>>>0)%3===0;
}
// Greedy placement uses collapsed card heights; hover never changes assignment.
export function balanceColumns(creations,columns,heights){
 const groups=Array.from({length:columns},()=>[]),totals=Array(columns).fill(0);
 for(const creation of creations){
  const column=totals.indexOf(Math.min(...totals));
  groups[column].push(creation);
  totals[column]+=(heights[creation.id]||300)+20;
 }
 return groups;
}
export default function ExploreGrid({creations=[],onCreationClick,loading=false,loadingMore=false,rowOrder=false,explore=false,seed=''}){
 const grid=useRef(null);
 const placement=useRef({columns:0,slots:new Map()});
 const [heights,setHeights]=useState({});
 const [columns,setColumns]=useState(()=>window.innerWidth>=1280?4:window.innerWidth>=1024?3:window.innerWidth>=640||explore?2:1);
 useEffect(()=>{const resize=()=>setColumns(window.innerWidth>=1280?4:window.innerWidth>=1024?3:window.innerWidth>=640||explore?2:1);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[explore]);
 useLayoutEffect(()=>{
  if(loading||rowOrder||!grid.current)return;
  let frame;
  const measure=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    const measured={};
    for(const card of grid.current?.querySelectorAll('[data-card-id]')||[]){
     const image=card.querySelector('.vv-card-image>img');
     // Unloaded images reserve the estimate until their natural dimensions arrive.
     if(image&&!image.naturalWidth)continue;
     const details=card.querySelector('.vv-card-details');
     measured[card.dataset.cardId]=Math.round(card.getBoundingClientRect().height-(details?.getBoundingClientRect().height||0));
    }
    setHeights(current=>Object.entries(measured).some(([id,height])=>Math.abs((current[id]||0)-height)>1)?{...current,...measured}:current);
   });
  };
  const observer=new ResizeObserver(measure);
  grid.current.querySelectorAll('[data-card-id]').forEach(card=>observer.observe(card));
  measure();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[creations,columns,loading,rowOrder,heights]);
 const multiIds=new Set(),seenPosts=new Set();
 for(const creation of creations){const postId=creation.postId||creation.id;if(explore&&!seenPosts.has(postId)&&isMultiCard(creation,seed)){multiIds.add(creation.id);seenPosts.add(postId);}}
 let groups;
 if(explore){
  // Keep mounted results in their columns as images load or carousel state changes.
  // Append new results to the shortest measured column; resize rebuilds placement.
  if(placement.current.columns!==columns)placement.current={columns,slots:new Map()};
  const {slots}=placement.current,totals=Array(columns).fill(0);
  groups=Array.from({length:columns},()=>[]);
  for(const creation of creations){
   const column=slots.has(creation.id)?slots.get(creation.id):totals.indexOf(Math.min(...totals));
   slots.set(creation.id,column);groups[column].push(creation);
   const width=(grid.current?.clientWidth||window.innerWidth-32)/columns;
   totals[column]+=(heights[creation.id]||(multiIds.has(creation.id)?width*1.25+96:width*.625+96))+20;
  }
 }else groups=balanceColumns(creations,columns,heights);
 const card=creation=>multiIds.has(creation.id)?<MultiImageCard key={creation.id} creation={creation} touchTitle={showTouchTitle(creation,seed)} onOpen={onCreationClick}/>:<ExploreCard key={creation.id} creation={creation} touchTitle={showTouchTitle(creation,seed)} onOpen={onCreationClick}/>;
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
 },[creations,columns,loading,loadingMore,rowOrder,heights]);
 if(rowOrder)return <div className="vv-portfolio-grid grid items-start gap-5" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}}>{creations.map(creation=><ExploreCard key={creation.id} creation={creation} onOpen={onCreationClick}/>)}{(loading||loadingMore)&&Array.from({length:columns*2},(_,i)=><CardSkeleton key={i}/>)}</div>;
 if(!loading&&!creations.length)return <p className="py-16 text-center text-on-surface-variant">No matching images. Try another category or keyword.</p>;
 return <div ref={grid} className={'grid items-start gap-5 '+(explore?'vv-explore-grid':'')} style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}} aria-busy={loading||loadingMore}>{Array.from({length:columns},(_,column)=><div key={column} className="flex min-w-0 flex-col gap-5">{loading?Array.from({length:2},(_,i)=><CardSkeleton key={i}/>):groups[column].map(card)}{loadingMore&&Array.from({length:2},(_,i)=><CardSkeleton key={`more-${i}`}/>)}</div>)}</div>;
}
