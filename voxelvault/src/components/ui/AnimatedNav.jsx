import {useEffect,useRef,useState} from 'react';
import {NavLink,useLocation,useNavigate} from 'react-router';
import AnimatedArtwork from './AnimatedArtwork';
export default function AnimatedNav({name,label,to,onAction,onNavigate,disabled=false}){
 const [active,setActive]=useState(false);const pointer=useRef('');const timer=useRef();const pending=useRef(false);const navigate=useNavigate();const location=useLocation();
 useEffect(()=>()=>{clearTimeout(timer.current);pending.current=false;setActive(false);},[location.key]);
 function click(e){
  if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  if(pending.current){e.preventDefault();return;}
  const touch=pointer.current==='touch'||pointer.current==='pen'||(e.detail>0&&matchMedia('(pointer: coarse), (max-width:1024px)').matches);pointer.current='';
  if(touch&&!matchMedia('(prefers-reduced-motion:reduce)').matches){e.preventDefault();pending.current=true;setActive(true);clearTimeout(timer.current);timer.current=setTimeout(()=>{pending.current=false;setActive(false);if(to){onNavigate?.();navigate(to);}else onAction?.();},name==='brand'?1320:900);}
  else if(to)onNavigate?.();else onAction?.();
 }
 function play(){if(pending.current||(name==='brand'&&active))return;if(name!=='brand'){setActive(true);return;}setActive(true);clearTimeout(timer.current);timer.current=setTimeout(()=>setActive(false),1320);}
 const props={onClick:click,onPointerDown:e=>{pointer.current=e.pointerType;},onPointerEnter:e=>{if(e.pointerType==='mouse')play();},onFocus:play,onBlur:()=>{if(!pending.current&&name!=='brand')setActive(false);},onPointerLeave:()=>{if(!pending.current&&name!=='brand')setActive(false);},'aria-label':label,className:`vv-nav vv-nav-${name} ${active?'vv-nav-playing':''}`,title:label};
 const content=<AnimatedArtwork name={name} active={active}/>;
 return to?<NavLink {...props} to={to} end={to==='/'}>{content}</NavLink>:<button {...props} type="button" disabled={disabled}>{content}</button>;
}
