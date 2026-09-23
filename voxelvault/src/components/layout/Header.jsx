import { NavLink, useLocation } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import Brand from '../ui/Brand';
import { notify } from '../../lib/notifications';

export default function Header({ searchQuery, onSearchChange }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [openAt,setOpenAt]=useState(null);
  const [busy,setBusy]=useState(false);
  const open = openAt === location.key;
  const drawer=useRef(null);
  useEffect(()=>{if(open)drawer.current?.showModal();else drawer.current?.close();},[open]);
  const navClass=({isActive})=>`rounded-full px-4 py-2.5 text-sm transition ${isActive?'bg-primary/10 text-primary':'text-on-surface-variant hover:bg-white/5 hover:text-primary'}`;
  async function logout() {
    const event=new CustomEvent('vault:before-signout',{cancelable:true,detail:{proceed:performLogout}});
    if(!window.dispatchEvent(event))return;
    await performLogout();
  }
  async function performLogout() {
    setBusy(true);
    try { await signOut();setOpenAt(null);notify('You have signed out.'); }
    catch(error) {notify(error.message,'error');} finally {setBusy(false);}
  }
  const navigation=<>
        <NavLink to="/" end className={navClass} onClick={()=>setOpenAt(null)}>Explore</NavLink>
        <NavLink to="/my-posts" className={navClass} onClick={()=>setOpenAt(null)}>My Posts</NavLink>
        <NavLink to="/create" onClick={()=>setOpenAt(null)} className="vault-action rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-on-primary">+ Create</NavLink>
        {user && <NavLink to="/profile" className={navClass} onClick={()=>setOpenAt(null)}>Profile</NavLink>}
        {user ? <button type="button" disabled={busy} onClick={logout} className="rounded-full border border-white/15 px-4 py-2.5 text-sm disabled:opacity-50">{busy?'Signing out…':'Sign out'}</button> : <NavLink to="/login" className={navClass} onClick={()=>setOpenAt(null)}>Sign in</NavLink>}
  </>;
  return <header className="sticky top-0 z-50 border-b border-white/10 bg-background/95 backdrop-blur-xl" onKeyDown={e=>{if(e.key==='Escape'){setOpenAt(null);document.getElementById('navigation-toggle')?.focus();}}}>
    <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
      <Brand />
      <button id="navigation-toggle" type="button" aria-expanded={open} aria-controls="main-navigation" aria-label={open?'Close navigation':'Open navigation'} onClick={()=>setOpenAt(open?null:location.key)} className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-primary xl:hidden">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={open?'M6 6l12 12M6 18L18 6':'M4 6h16M4 12h16M4 18h16'} /></svg>
      </button>
      <div role="search" className="order-3 w-full min-w-0 xl:order-2 xl:ml-auto xl:w-auto xl:max-w-md xl:flex-1">
        <label htmlFor="creation-search" className="sr-only">Search creations</label>
        <div className="relative"><span aria-hidden="true" className="absolute left-4 top-3 text-on-surface-variant">⌕</span><input id="creation-search" type="search" value={searchQuery} onChange={e=>{setOpenAt(null);onSearchChange(e.target.value);}} placeholder="Search worlds, builds, inspiration…" className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></div>
      </div>
      <nav aria-label="Main navigation" className="order-1 ml-3 hidden items-center gap-2 xl:flex">{navigation}</nav>
      <dialog ref={drawer} id="main-navigation" className="vault-drawer" onCancel={e=>{e.preventDefault();setOpenAt(null);}} onClick={e=>{if(e.target===e.currentTarget){const rect=e.currentTarget.getBoundingClientRect();if(e.clientX<rect.left)setOpenAt(null);}}}>
        <div className="mb-8 flex items-center justify-between"><span className="text-xs uppercase tracking-widest text-primary">Your vault</span><button type="button" aria-label="Close navigation" onClick={()=>setOpenAt(null)} className="rounded-full border border-white/10 px-4 py-2">×</button></div>
        <Brand onNavigate={()=>setOpenAt(null)}/><nav aria-label="Mobile navigation" className="mt-8 flex flex-col items-stretch gap-3">{navigation}</nav>
      </dialog>
    </div>
  </header>;
}
