import {useState} from 'react';
import {Link} from 'react-router';
import Icon from '../ui/Icon';
import HomeImage from './HomeImage';
export default function ShowcaseDeck({posts,loading}){
 const [index,setIndex]=useState(0);
 const active=index%Math.max(1,posts.length);
 const shift=direction=>setIndex(current=>(current+direction+posts.length)%posts.length);
 return <section className="vv-showcase" aria-label="Community showcase" onKeyDown={e=>{if(posts.length>1&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();shift(e.key==='ArrowLeft'?-1:1);}}}>
  <div className="vv-showcase-stack">
   {!posts.length?<div className="vv-showcase-empty">{loading?<HomeImage/>:<div className="vv-home-empty"><Icon name="cube"/><p>Your world could be here.</p></div>}</div>:posts.map((post,i)=>{const offset=(i-active+posts.length)%posts.length;return <Link key={post.id} to={`/creations/${post.id}`} tabIndex={offset===0?0:-1} aria-hidden={offset!==0} className="vv-showcase-card" data-active={offset===0} style={{'--deck-offset':offset,zIndex:posts.length-offset,transform:offset===0?'translate3d(0,0,0)':`translate3d(${offset%2?18:-16}px,${-offset*19}px,0) rotate(${offset%2?3:-3}deg) scale(${1-offset*.045})`,opacity:offset<3?1-offset*.18:0,pointerEvents:offset===0?'auto':'none'}}>
    <HomeImage key={post.image} src={post.image} alt={post.alt||post.title} priority={i===0}/><div className="vv-showcase-scrim"/>
    <div className="vv-showcase-top"><span><i/> FROM THE COMMUNITY</span><span className="vv-showcase-open"><Icon name="arrowUpRight"/></span></div>
    <div className="vv-showcase-caption"><span>{post.category}</span><h2>{post.title}</h2><p>By {post.creator}</p><small>VOXELVAULT / SPATIAL ARCHIVE — {String(i+1).padStart(2,'0')}</small></div>
   </Link>;})}
  </div>
  {posts.length>1&&<div className="vv-showcase-controls"><button type="button" onClick={()=>shift(-1)} aria-label="Previous showcase"><Icon name="chevronRight" className="rotate-180"/></button><div>{posts.map((post,i)=><button key={post.id} type="button" onClick={()=>setIndex(i)} aria-label={`Showcase ${i+1}: ${post.title}`} aria-pressed={i===active}><span/></button>)}</div><button type="button" onClick={()=>shift(1)} aria-label="Next showcase"><Icon name="chevronRight"/></button></div>}
  <p className="sr-only" aria-live="polite">{posts[active]?.title}</p>
 </section>;
}
