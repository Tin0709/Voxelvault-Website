import {useEffect,useState} from 'react';
import ExploreCard,{CardSkeleton} from './ExploreCard';
export default function ExploreGrid({creations=[],onCreationClick,loading=false}){
 const [columns,setColumns]=useState(()=>window.innerWidth>=1280?4:window.innerWidth>=1024?3:window.innerWidth>=640?2:1);
 useEffect(()=>{const resize=()=>setColumns(window.innerWidth>=1280?4:window.innerWidth>=1024?3:window.innerWidth>=640?2:1);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 if(!loading&&!creations.length)return <p className="py-16 text-center text-on-surface-variant">No matching images. Try another category or keyword.</p>;
 return <div className="grid items-start gap-5" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}} aria-busy={loading}>{Array.from({length:columns},(_,column)=><div key={column} className="flex min-w-0 flex-col gap-5">{loading?Array.from({length:2},(_,i)=><CardSkeleton key={i}/>):creations.filter((_,i)=>i%columns===column).map(creation=><ExploreCard key={creation.id} creation={creation} onOpen={onCreationClick}/>)}</div>)}</div>;
}
