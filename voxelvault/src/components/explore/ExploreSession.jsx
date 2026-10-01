import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useLocation,useNavigationType} from 'react-router';

// One live Explore history entry only. Keeping its existing UI state also keeps
// measured masonry heights and native carousel scroll positions ready for Back.
const RETAIN_MS=10*60*1000;
export default function ExploreSession({resetVersion,children}){
 const location=useLocation(),navigation=useNavigationType();
 const active=location.pathname==='/explore';
 const detail=/^\/creations\/[^/]+$/.test(location.pathname);
 const [entry,setEntry]=useState(null);
 const scroll=useRef(0),retained=useRef(null);
 if(active&&(!entry||entry.key!==location.key||entry.resetVersion!==resetVersion)){
  scroll.current=0;
  setEntry({key:location.key,resetVersion});
 }else if(!active&&!detail&&entry){setEntry(null);}
 // A fresh PUSH/REPLACE must never inherit another Explore history entry.
 const restoring=active&&entry?.key===location.key&&navigation==='POP';
 useLayoutEffect(()=>{
  if(!active)return;
  window.scrollTo({top:restoring?scroll.current:0,behavior:'instant'});
  const remember=()=>{scroll.current=window.scrollY;};
  window.addEventListener('scroll',remember,{passive:true});
  return()=>window.removeEventListener('scroll',remember);
 },[active,entry,restoring]);
 useEffect(()=>{
  if(active||!entry)return;
  const timer=setTimeout(()=>setEntry(null),RETAIN_MS);
  return()=>clearTimeout(timer);
 },[active,entry]);
 if(!entry)return null;
 // Freeze props while away, so header actions cannot mutate the retained feed.
 if(active)retained.current=children;
 return <div key={entry.key+':'+entry.resetVersion} aria-hidden={!active} inert={!active}
  onClickCapture={()=>{if(active)scroll.current=window.scrollY;}}
  style={active?{display:'contents'}:{position:'fixed',top:0,left:0,right:0,visibility:'hidden',pointerEvents:'none'}}>
  {active?children:retained.current}
 </div>;
}
