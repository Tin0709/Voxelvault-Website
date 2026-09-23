import {useLocation,useNavigate} from 'react-router';
import {useState,useRef,useEffect} from 'react';
import {useAuth} from '../../auth/AuthContext';
import Brand from '../ui/Brand';
import AnimatedNav from '../ui/AnimatedNav';
import AnimatedArtwork from '../ui/AnimatedArtwork';
import MobileMenu from './MobileMenu';
import {notify} from '../../lib/notifications';

function SearchField({searchQuery,onSearchChange,onFocusChange}){
 const input=useRef(null);const [hover,setHover]=useState(false);const [focused,setFocused]=useState(false);
 return <div role="search" onPointerEnter={()=>setHover(true)} onPointerLeave={()=>setHover(false)} onFocus={()=>{setFocused(true);onFocusChange(true);}} onBlur={()=>{setFocused(false);onFocusChange(false);}} className={`vv-search ${hover||focused?'vv-search-expanded':''}`}>
  <AnimatedArtwork name="search" active={hover||focused}/><label className="sr-only" htmlFor="creation-search">Search creations</label><input ref={input} id="creation-search" type="search" value={searchQuery} onChange={e=>onSearchChange(e.target.value)} placeholder="Search worlds, builds…"/>{!focused&&<button type="button" className="vv-search-trigger" aria-label="Open search" onClick={()=>input.current?.focus()}/>}
 </div>;
}
function NavigationIndicator({bar,pathname,hidden}){
 const marker=useRef(null);
 useEffect(()=>{
  const root=bar.current;const line=marker.current;if(!root||!line)return;
  const target=pathname==='/'?'explore':pathname==='/create'?'create':pathname.startsWith('/profile')||pathname==='/my-posts'?'profile':pathname==='/register'?'signup':null;
  const update=()=>{const button=target&&root.querySelector(`.vv-nav-${target}`);if(!button||!button.getBoundingClientRect().width){line.style.opacity='0';return;}const r=button.getBoundingClientRect();const parent=root.getBoundingClientRect();line.style.transform=`translateX(${r.left-parent.left+r.width/2-22}px)`;line.style.opacity=hidden?'0':'1';};
  update();const observer=new ResizeObserver(update);observer.observe(root);root.querySelectorAll('.vv-nav,.vv-search,.vv-desktop-navigation').forEach(e=>observer.observe(e));window.addEventListener('resize',update);
  return()=>{observer.disconnect();window.removeEventListener('resize',update);};
 },[bar,pathname,hidden]);
 return <span ref={marker} aria-hidden="true" className="vv-navigation-indicator"/>;
}
export default function Header({searchQuery,onSearchChange}){
 const {user,signOut}=useAuth();const location=useLocation();const navigate=useNavigate();
 const [phase,setPhase]=useState('closed');const phaseRef=useRef('closed');const [busy,setBusy]=useState(false);const [searchFocused,setSearchFocused]=useState(false);
 const drawer=useRef(null);const bar=useRef(null);const closeTimer=useRef();const afterClose=useRef(null);const lastRoute=useRef(location.key);
 function finishClose(){clearTimeout(closeTimer.current);drawer.current?.close();phaseRef.current='closed';setPhase('closed');const action=afterClose.current;afterClose.current=null;action?.();}
 function close(action){if(phaseRef.current==='closing')return;if(phaseRef.current==='closed'){action?.();return;}afterClose.current=action;phaseRef.current='closing';setPhase('closing');if(matchMedia('(prefers-reduced-motion:reduce)').matches)finishClose();else closeTimer.current=setTimeout(finishClose,340);}
 function open(){if(phaseRef.current!=='closed')return;phaseRef.current='open';setPhase('open');}
 useEffect(()=>{if(phase==='open')drawer.current?.showModal();},[phase]);
 useEffect(()=>()=>clearTimeout(closeTimer.current),[]);
 useEffect(()=>{if(lastRoute.current===location.key)return;lastRoute.current=location.key;const frame=requestAnimationFrame(()=>{if(phaseRef.current==='open')close();});return()=>cancelAnimationFrame(frame);});
 async function performLogout(){setBusy(true);try{await signOut();close();notify('You have signed out.');}catch(error){notify(error.message,'error');}finally{setBusy(false);}}
 async function logout(){const event=new CustomEvent('vault:before-signout',{cancelable:true,detail:{proceed:performLogout}});if(window.dispatchEvent(event))await performLogout();}
 return <header className="sticky top-0 z-50 border-b border-white/10 bg-background/95 backdrop-blur-xl">
  <div ref={bar} className="vv-header-bar mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
   <Brand/><div className="hidden xl:block"><AnimatedNav name="explore" label="Explore" to="/"/></div>
   <nav aria-label="Main navigation" className="vv-desktop-navigation ml-auto hidden items-center xl:flex"><SearchField searchQuery={searchQuery} onSearchChange={onSearchChange} onFocusChange={setSearchFocused}/><AnimatedNav name="create" label="Create" to="/create"/>{user&&<AnimatedNav name="profile" label="Profile" to="/profile"/>}{user?<AnimatedNav name="signout" label={busy?'Signing out…':'Sign out'} onAction={logout} disabled={busy}/>:<AnimatedNav name="signup" label="Sign up" to="/register"/>}</nav>
   <NavigationIndicator bar={bar} pathname={location.pathname} hidden={searchFocused}/>
   <button id="navigation-toggle" type="button" aria-expanded={phase!=='closed'} aria-controls="main-navigation" aria-label="Open navigation" onClick={open} className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 text-primary xl:hidden"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
   <dialog ref={drawer} id="main-navigation" aria-label="Your vault navigation" className={`vault-drawer vv-mobile-menu ${phase==='closing'?'vv-drawer-closing':''}`} onCancel={e=>{e.preventDefault();close();}} onAnimationEnd={e=>{if(e.target===e.currentTarget&&e.animationName==='vv-drawer-out')finishClose();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}}>
    {phase!=='closed'&&<MobileMenu user={user} busy={busy} pathname={location.pathname} query={searchQuery} onClose={()=>close()} onNavigate={to=>close(()=>navigate(to))} onSearch={value=>close(()=>onSearchChange(value))} onSignOut={()=>close(logout)}/>}
   </dialog>
  </div>
 </header>;
}
