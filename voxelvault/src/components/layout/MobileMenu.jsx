import {Link} from 'react-router';
import {useState} from 'react';
import {useApi} from '../../lib/useApi';
import {formatBytes} from '../../utils/attachments';
import Icon from '../ui/Icon';

function MenuLink({to,onNavigate,children,className='',...props}){
 return <Link to={to} {...props} className={className} onClick={e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();onNavigate(to);}}>{children}</Link>;
}
function AccountMenu({onNavigate,pathname}){
 const profile=useApi('/me/profile');
 const storage=useApi('/me/storage');
 const data=storage.data;
 return <>
  <MenuLink to="/profile" onNavigate={onNavigate} aria-current={pathname.startsWith('/profile')?'page':undefined} className="vv-menu-row vv-menu-profile"><span className="vv-menu-icon"><Icon name="user"/><i/></span><span><strong>Profile</strong><small>{profile.data?.handle?'@'+profile.data.handle:'Your personal vault'}</small></span><span className="vv-menu-chevron">›</span></MenuLink>
  <div className="vv-menu-bottom">
   <MenuLink to="/my-posts" onNavigate={onNavigate} className="vv-menu-storage"><span><span><Icon name="archive"/> Storage usage</span><b>{data?`${formatBytes(data.usedBytes)} / ${formatBytes(data.quotaBytes)}`:storage.error?'Unavailable':'Loading…'}</b></span><span className="vv-menu-storage-track"><i style={{width:data?`${Math.min(100,data.usedBytes/Math.max(1,data.quotaBytes)*100)}%`:'0%'}}/></span></MenuLink>
  </div>
 </>;
}
export default function MobileMenu({user,busy,pathname,query,onSearch,onNavigate,onClose,onSignOut}){
 const [search,setSearch]=useState(query);
 return <div className="vv-menu-content">
  <div className="vv-menu-top"><span>● YOUR VAULT</span><button type="button" onClick={onClose} aria-label="Close navigation"><Icon name="close"/></button></div>
  <MenuLink to="/" onNavigate={onNavigate} className="vv-menu-brand" aria-label="VoxelVault home"><span className="vv-menu-logo"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="m20 5 13 8-13 8-13-8Z" fill="#91ebcb"/><path d="m7 13 13 8v15L7 28Z" fill="#21b990"/><path d="m20 21 13-8v15l-13 8Z" fill="#08745a"/></svg></span><span><strong>VoxelVault</strong><small>SPATIAL ARCHIVE</small></span></MenuLink>
  <form role="search" className="vv-menu-search" onSubmit={e=>{e.preventDefault();onSearch(search);}}><Icon name="search"/><label className="sr-only" htmlFor="mobile-search">Search creations</label><input id="mobile-search" type="search" enterKeyHint="search" placeholder="Search worlds, builds…" value={search} onChange={e=>setSearch(e.target.value)}/><button type="submit" aria-label="Search">↗</button></form>
  <nav aria-label="Mobile navigation" className="vv-menu-links">
   <MenuLink to="/" onNavigate={onNavigate} aria-current={pathname==='/'?'page':undefined} className="vv-menu-row"><span className="vv-menu-icon"><Icon name="compass"/></span><span><strong>Explore</strong><small>Discover worlds & creations</small></span><span className="vv-menu-chevron">›</span></MenuLink>
   {user&&<MenuLink to="/my-posts" onNavigate={onNavigate} aria-current={pathname==='/my-posts'?'page':undefined} className="vv-menu-row"><span className="vv-menu-icon"><Icon name="archive"/></span><span><strong>My Posts</strong><small>Manage your posts & files</small></span><span className="vv-menu-chevron">›</span></MenuLink>}
   <MenuLink to="/create" onNavigate={onNavigate} aria-current={pathname==='/create'?'page':undefined} className="vv-menu-create"><span><Icon name="plus"/></span>Create Post <small>NEW BUILD</small></MenuLink>
   {user?<AccountMenu onNavigate={onNavigate} pathname={pathname}/>:<MenuLink to="/register" onNavigate={onNavigate} className="vv-menu-row"><span className="vv-menu-icon"><Icon name="user"/></span><span><strong>Sign up</strong><small>Join the creative community</small></span><span className="vv-menu-chevron">›</span></MenuLink>}
  </nav>
  {user?<button type="button" disabled={busy} onClick={onSignOut} className="vv-menu-signout"><Icon name="logout"/>{busy?'Signing out…':'Sign out'}<i/></button>:<MenuLink to="/login" onNavigate={onNavigate} className="vv-menu-signout"><Icon name="user"/>Sign in</MenuLink>}
  <p className="vv-menu-footnote">VOXELVAULT <span>•</span> YOUR CREATIVE ARCHIVE</p>
 </div>;
}
