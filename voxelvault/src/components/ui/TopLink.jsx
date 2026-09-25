import {Link,useNavigate} from 'react-router';
import {useEffect,useRef} from 'react';
export default function TopLink({to,children,...props}){
 const navigate=useNavigate();const cleanup=useRef(null);useEffect(()=>()=>cleanup.current?.(),[]);
 function click(e){if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();cleanup.current?.();if(window.scrollY<2||matchMedia('(prefers-reduced-motion:reduce)').matches){window.scrollTo(0,0);navigate(to);return;}let timer;const finish=()=>{clearTimeout(timer);window.removeEventListener('scrollend',finish);cleanup.current=null;navigate(to);};cleanup.current=()=>{clearTimeout(timer);window.removeEventListener('scrollend',finish);};window.addEventListener('scrollend',finish,{once:true});timer=setTimeout(finish,1600);window.scrollTo({top:0,behavior:'smooth'});}
 return <Link {...props} to={to} onClick={click}>{children}</Link>;
}
