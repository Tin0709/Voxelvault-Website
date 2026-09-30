import {Link} from 'react-router';
import {useState,useRef,useEffect} from 'react';
import {useApi} from '../../lib/useApi';
import {formatBytes} from '../../utils/attachments';
import Icon from '../ui/Icon';
import Brand from '../ui/Brand';
import SearchField from './SearchField';

function MenuLink({to,onNavigate,children,className='',...props}){
 const timer=useRef(null);const [playing,setPlaying]=useState(false);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 return <Link to={to} {...props} className={`${className} ${playing?'vv-menu-playing':''}`} onClick={e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();if(playing)return;if(to==='/create'&&!matchMedia('(prefers-reduced-motion:reduce)').matches){setPlaying(true);timer.current=setTimeout(()=>onNavigate(to),400);}else onNavigate(to);}}>{children}</Link>;
}
function AccountMenu({onNavigate,pathname,user}){
 const profile=useApi('/me/profile');
 const storage=useApi('/me/storage');
 const data=storage.data;
 const [failedAvatar,setFailedAvatar]=useState('');
 const account=profile.data;
 const name=account?.name||user.user_metadata?.full_name||user.user_metadata?.name||'Your profile';
 const avatar=account?.avatarUrl;
 const initials=account?.initials||name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase();
 return <>
  <MenuLink to="/profile" onNavigate={onNavigate} aria-current={pathname.startsWith('/profile')?'page':undefined} className="vv-menu-row vv-menu-profile"><span className="vv-menu-icon vv-menu-avatar" aria-hidden="true">{avatar&&failedAvatar!==avatar?<img src={avatar} alt="" onError={()=>setFailedAvatar(avatar)}/>:<span>{initials}</span>}<i/></span><span className="vv-menu-account-copy"><span className="vv-menu-account-label">Profile</span><strong>{name}</strong><small>{account?.handle?'@'+account.handle:profile.loading?'Loading profile…':'Your personal vault'}</small></span><span className="vv-menu-chevron"><Icon name="chevronRight"/></span></MenuLink>
  <div className="vv-menu-bottom">
   <MenuLink to="/my-posts" onNavigate={onNavigate} className="vv-menu-storage"><span><span><Icon name="archive"/> Storage usage</span><b>{data?`${formatBytes(data.usedBytes)} / ${formatBytes(data.quotaBytes)}`:storage.error?'Unavailable':'Loading…'}</b></span><span className="vv-menu-storage-track"><i style={{width:data?`${Math.min(100,data.usedBytes/Math.max(1,data.quotaBytes)*100)}%`:'0%'}}/></span></MenuLink>
  </div>
 </>;
}
export default function MobileMenu({categories,onCategorySelect,user,busy,pathname,query,onSearch,onNavigate,onClose,onSignOut}){

 return <div className="vv-menu-content">
  <div className="vv-menu-top"><span>● YOUR VAULT</span><button type="button" onClick={onClose} aria-label="Close navigation"><Icon name="close"/></button></div>
  <div className="vv-menu-brand"><Brand onFollow={onNavigate}/><small>SPATIAL ARCHIVE</small></div>
  <SearchField categories={categories} onCategorySelect={onCategorySelect} mobile searchQuery={query} onSearchChange={onSearch}/>
  <nav aria-label="Mobile navigation" className="vv-menu-links">
   <MenuLink to="/explore" onNavigate={onNavigate} aria-current={pathname==='/explore'?'page':undefined} className="vv-menu-row"><span className="vv-menu-icon"><Icon name="compass"/></span><span><strong>Explore</strong><small>Discover worlds & creations</small></span><span className="vv-menu-chevron"><Icon name="chevronRight"/></span></MenuLink>
   {user&&<MenuLink to="/my-posts" onNavigate={onNavigate} aria-current={pathname==='/my-posts'?'page':undefined} className="vv-menu-row"><span className="vv-menu-icon"><Icon name="archive"/></span><span><strong>My Posts</strong><small>Manage your posts & files</small></span><span className="vv-menu-chevron"><Icon name="chevronRight"/></span></MenuLink>}
   <MenuLink to="/create" onNavigate={onNavigate} aria-current={pathname==='/create'?'page':undefined} className="vv-menu-create"><span><Icon name="plus"/></span>Create Post <small>NEW BUILD</small></MenuLink>
   {user?<AccountMenu user={user} onNavigate={onNavigate} pathname={pathname}/>:<MenuLink to="/register" onNavigate={onNavigate} className="vv-menu-row"><span className="vv-menu-icon"><Icon name="user"/></span><span><strong>Sign up</strong><small>Join the creative community</small></span><span className="vv-menu-chevron"><Icon name="chevronRight"/></span></MenuLink>}
  </nav>
  {user&&<button type="button" disabled={busy} onClick={onSignOut} className="vv-menu-signout"><Icon name="logout"/>{busy?'Signing out…':'Sign out'}<i/></button>}
  <p className="vv-menu-footnote">VOXELVAULT <span>•</span> YOUR CREATIVE ARCHIVE</p>
 </div>;
}
