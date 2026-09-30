import {Link,useNavigate} from 'react-router';
import {useEffect,useRef} from 'react';
import {useAuth} from '../../auth/AuthContext';
import Brand from '../ui/Brand';
import Icon from '../ui/Icon';

export default function Footer({onExplore}) {
 const {user}=useAuth();const navigate=useNavigate();const pendingScroll=useRef(null);
 useEffect(()=>()=>pendingScroll.current?.(),[]);
 function follow(to){
  pendingScroll.current?.();
  const arrive=()=>{if(to==='/explore')onExplore?.();navigate(to);};
  if(window.scrollY<2||window.matchMedia('(prefers-reduced-motion: reduce)').matches){window.scrollTo({top:0,behavior:'instant'});arrive();return;}
  let timer;
  const cancel=()=>{clearTimeout(timer);window.removeEventListener('scrollend',finish);pendingScroll.current=null;};
  const finish=()=>{cancel();arrive();};
  pendingScroll.current=cancel;
  window.addEventListener('scrollend',finish,{once:true});
  timer=setTimeout(finish,1600);
  scrollToTop();
 }
 function followLink(event,to){if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();follow(to);}
 function scrollToTop(){window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 const groups=[
  {title:'Discover',icon:'compass',links:[['Home','/'],['Explore creations','/explore'],['Share a creation','/create']]},
  {title:'Creator studio',icon:'cube',links:[['My posts & storage','/my-posts'],['My profile','/profile'],['Edit profile','/profile/edit']]},
  {title:'Your vault',icon:'archive',links:user?[['Open my vault','/my-posts'],['Create a new post','/create']]:[['Join the community','/register'],['Sign in','/login']]},
 ];
 return <footer className="vv-footer">

  <div className="vv-footer-inner">
   <div className="vv-footer-top"><div><div className="vv-footer-brand"><Brand onFollow={follow}/><span>{new Date().getFullYear()}</span></div><p>A home for extraordinary worlds and the ideas behind them.</p></div><button type="button" onClick={scrollToTop} className="vv-footer-top-button">Back to top <span><Icon name="arrow" className="rotate-90"/></span></button></div>
   <div className="vv-footer-strip"><span><i/> BUILT BLOCK BY BLOCK. KEPT TOGETHER.</span><span>Your ideas. Your worlds. Your vault.</span></div>
   <div className="vv-footer-grid">{groups.map(group=><nav key={group.title} className={group.title==='Your vault'?'vv-footer-vault':undefined} aria-label={`${group.title} footer links`}><h2><Icon name={group.icon}/>{group.title}</h2><ul>{group.links.map(([label,to])=><li key={label}><Link to={to} onClick={event=>followLink(event,to)}>{label}<Icon name="arrowUpRight"/></Link></li>)}</ul></nav>)}
    <div className="vv-footer-invite"><span><Icon name="plus"/> YOUR NEXT CHAPTER</span><h2>Make room for<br/>your next idea.</h2><p>Share your world, tell its story, and inspire someone to build.</p><Link to={user?'/create':'/register'} onClick={event=>followLink(event,user?'/create':'/register')}>{user?'Create a post':'Join the community'}<Icon name="arrowUpRight"/></Link></div>
   </div>
   <div className="vv-footer-features"><span><Icon name="image"/><span>Every detail<strong>Image galleries</strong></span></span><span><Icon name="lock"/><span>Your own space<strong>Private attachments</strong></span></span><span><Icon name="globe"/><span>Made to inspire<strong>Worlds worth sharing</strong></span></span></div>
   <div className="vv-footer-bottom"><p>© {new Date().getFullYear()} VoxelVault <span>·</span> Built block by block.</p><p>Images and builds belong to their respective creators.</p><Link to="/" onClick={event=>followLink(event,'/')} aria-label="Return to VoxelVault home">YOUR CREATIVE ARCHIVE <Icon name="cube"/></Link></div>
  </div>
 </footer>;
}
