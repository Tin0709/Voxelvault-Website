import { useLocation } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import Brand from '../ui/Brand';
import AnimatedNav from '../ui/AnimatedNav';
import AnimatedArtwork from '../ui/AnimatedArtwork';
function SearchField({mobile,searchQuery,onSearchChange,close}){
 const [active,setActive]=useState(false);const [focused,setFocused]=useState(false);const [query,setQuery]=useState(searchQuery);
 const submit=()=>{onSearchChange(query);close();};
 return <div role="search" onPointerEnter={()=>setActive(true)} onPointerLeave={()=>setActive(false)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} className={`vv-search ${mobile?'vv-search-mobile':''}`}>
  <AnimatedArtwork name="search" active={active||focused||Boolean(searchQuery)||mobile}/>
  <label className="sr-only" htmlFor={mobile?'mobile-search':'creation-search'}>Search creations</label>
  <input id={mobile?'mobile-search':'creation-search'} type="search" enterKeyHint="search" value={mobile?query:searchQuery} onChange={e=>mobile?setQuery(e.target.value):onSearchChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){if(mobile)submit();else close();}}} placeholder="Search worlds, builds…"/>
  {mobile&&<button type="button" aria-label="Search" onClick={submit} className="absolute right-2 top-2 h-8 w-8 rounded-full bg-primary/10 text-primary">↗</button>}
 </div>;
}
import Icon from '../ui/Icon';
import { notify } from '../../lib/notifications';
export default function Header({searchQuery,onSearchChange}){
 const {user,signOut}=useAuth();const location=useLocation();const [openAt,setOpenAt]=useState(null);const [busy,setBusy]=useState(false);const drawer=useRef(null);const open=openAt===location.key;
 useEffect(()=>{if(open)drawer.current?.showModal();else drawer.current?.close();},[open]);
 async function performLogout(){setBusy(true);try{await signOut();setOpenAt(null);notify('You have signed out.');}catch(error){notify(error.message,'error');}finally{setBusy(false);}}
 async function logout(){const event=new CustomEvent('vault:before-signout',{cancelable:true,detail:{proceed:performLogout}});if(window.dispatchEvent(event))await performLogout();}
 const close=()=>setOpenAt(null);
 const nav=(mobile=false)=><>
  {mobile&&<AnimatedNav mobile name="explore" label="Explore" description="Discover worlds & creations" to="/" onNavigate={close}/>}
  <AnimatedNav mobile={mobile} name="create" label="Create" description="Share a new creation" to="/create" onNavigate={close}/>
  {user&&<AnimatedNav mobile={mobile} name="profile" label="Profile" description="Your profile, posts & storage" to="/profile" onNavigate={close}/>}
  {user?<AnimatedNav mobile={mobile} name="signout" label={busy?'Signing out…':'Sign out'} description="Leave your account securely" onAction={logout} disabled={busy}/>:<AnimatedNav mobile={mobile} name="signup" label="Sign up" description="Join the creative community" to="/register" onNavigate={close}/>}
 </>;
 const search=(mobile=false)=><SearchField mobile={mobile} searchQuery={searchQuery} onSearchChange={onSearchChange} close={close}/>;
 return <header className="sticky top-0 z-50 border-b border-white/10 bg-background/95 backdrop-blur-xl">
  <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
   <Brand/><div className="hidden xl:block"><AnimatedNav name="explore" label="Explore" to="/"/></div>
   <nav aria-label="Main navigation" className="ml-auto hidden min-w-0 items-center gap-1 xl:flex">{search()}{nav()}</nav>
   <button id="navigation-toggle" type="button" aria-expanded={open} aria-controls="main-navigation" aria-label="Open navigation" onClick={()=>setOpenAt(location.key)} className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 text-primary xl:hidden"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
   <dialog ref={drawer} id="main-navigation" aria-label="Your vault navigation" className="vault-drawer vv-mobile-menu" onCancel={close} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)close();}}}>
    {open&&<><div className="mb-5 flex items-center justify-between"><span className="text-xs uppercase tracking-[.2em] text-primary">● Your vault</span><button type="button" aria-label="Close navigation" onClick={close} className="rounded-full border border-white/10 p-3"><Icon name="close"/></button></div>
    <Brand onNavigate={close}/><p className="mb-6 ml-3 font-mono text-[10px] uppercase tracking-[.2em] text-on-surface-variant">Your creative archive</p>{search(true)}
    <nav aria-label="Mobile navigation" className="mt-6 flex flex-col gap-3">{nav(true)}</nav>
    <p className="mt-8 border-t border-white/10 pt-5 text-xs text-on-surface-variant">A home for extraordinary worlds.</p></>}
   </dialog>
  </div>
 </header>;
}
