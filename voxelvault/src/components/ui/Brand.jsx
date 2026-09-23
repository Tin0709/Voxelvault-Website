import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router';
import LogoMark from './LogoMark';

export default function Brand({onNavigate}) {
  const navigate=useNavigate();
  const location=useLocation();
  const [active,setActive]=useState(false);
  const pending=useRef(false);
  const pointer=useRef('');
  const timer=useRef(null);
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(()=>()=>{clearTimeout(timer.current);pending.current=false;},[location.key]);
  function finish(){
    clearTimeout(timer.current);
    setActive(false);
    if(pending.current){pending.current=false;onNavigate?.();navigate('/');}
  }
  function play(){if(!active&&!reduced())setActive(true);}
  function click(event){
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const touch=pointer.current==='touch'||pointer.current==='pen'||(event.detail>0&&window.matchMedia('(pointer: coarse), (max-width: 1024px)').matches);
    pointer.current='';
    if(!touch||reduced()){onNavigate?.();return;}
    event.preventDefault();
    if(pending.current)return;
    pending.current=true;setActive(true);
    // Animation-end is primary; this bounded fallback also handles interrupted CSS.
    timer.current=setTimeout(finish,1200);
  }
  return <Link to="/" aria-label="VoxelVault home" onClick={click} onPointerDown={e=>{pointer.current=e.pointerType;}} onPointerEnter={e=>{if(e.pointerType==='mouse')play();}} onFocus={play} className="inline-flex shrink-0 items-center gap-2 rounded-xl">
    <LogoMark active={active} onAnimationEnd={e=>{if(e.animationName==='singleLoopSparklePop'&&e.target.classList.contains('energy-sparkle-2'))finish();}}/>
    <span className="font-headline-lg text-2xl tracking-tight">VoxelVault</span>
  </Link>;
}
