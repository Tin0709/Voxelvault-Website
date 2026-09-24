import {useEffect,useRef,useState} from 'react';
// One clock for progress and replacement: pausing freezes both at the same point.
export function useMotionCycle({element,duration,onCycle,paused=false}){
 const elapsed=useRef(0);
 const [progress,setProgress]=useState(0);
 const [visible,setVisible]=useState(false);
 const [foreground,setForeground]=useState(()=>document.visibilityState==='visible');
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const motion=()=>setReduced(media.matches);const visibility=()=>setForeground(document.visibilityState==='visible');media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.15});if(element.current)observer.observe(element.current);return()=>{observer.disconnect();media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);};},[element]);
 const active=!paused&&!reduced&&visible&&foreground;
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>{elapsed.current+=100;if(elapsed.current>=duration){elapsed.current=0;onCycle();}setProgress(elapsed.current/duration);},100);return()=>clearInterval(timer);},[active,duration,onCycle]);
 function reset(){elapsed.current=0;setProgress(0);}
 return {progress,active,reduced,reset};
}
