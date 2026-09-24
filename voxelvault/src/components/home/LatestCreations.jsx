import {useCallback,useRef,useState} from 'react';
import {Link} from 'react-router';
import Icon from '../ui/Icon';
import HomeImage from './HomeImage';
import {CardSkeleton} from '../explore/ExploreCard';
import {useMotionCycle} from '../../lib/useMotionCycle';
import {randomPostWave} from '../../lib/randomPostWave';
function PostWave({posts}){
 const element=useRef(null);const [wave,setWave]=useState(()=>({posts:randomPostWave(posts),number:1}));
 const [paused,setPaused]=useState(false);const [hover,setHover]=useState(false);const [focused,setFocused]=useState(false);
 const next=useCallback(()=>setWave(current=>({posts:randomPostWave(posts,current.posts),number:current.number+1})),[posts]);
 const cycle=useMotionCycle({element,duration:7000,onCycle:next,paused:paused||hover||focused||posts.length<2});
 const leaving=cycle.progress>.88&&!hover&&!focused&&!paused;
 return <div ref={element} className="vv-wave" style={{'--cycle-state':cycle.active?'running':'paused'}}>
  <div className={`vv-wave-grid ${leaving?'vv-wave-leaving':''}`} onPointerOver={e=>{if(e.pointerType==='mouse')setHover(true);}} onPointerLeave={()=>setHover(false)} onFocus={()=>setFocused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
   {wave.posts.map((post,i)=><article key={`${wave.number}-${post.id}`} className="vv-latest-card vv-wave-card" style={{'--slot':i}}><Link to={`/creations/${post.id}`} className="vv-latest-image" aria-label={`View ${post.title}`}><HomeImage key={post.image} src={post.image} alt={post.alt||post.title}/><span className="vv-latest-badge">{post.gallery?.length||1} {(post.gallery?.length||1)===1?'IMAGE':'IMAGES'}</span><span className="vv-wave-open"><Icon name="arrowUpRight"/></span><span className="vv-latest-inspect">View creation <Icon name="arrowUpRight"/></span></Link><div className="vv-latest-copy"><p>{post.category}</p><h3><Link to={`/creations/${post.id}`}>{post.title}</Link></h3><Link className="vv-wave-author" to={`/creators/${post.creatorId}`}>{post.creatorAvatar?<img src={post.creatorAvatar} alt=""/>:<span className="vv-wave-initial">{post.creator?.slice(0,1)}</span>}<span>By <strong>{post.creator}</strong></span><Icon name="chevronRight"/></Link></div></article>)}
  </div>
  <div className="vv-wave-toolbar"><span className="vv-wave-counter">WAVE {String(wave.number).padStart(2,'0')}</span><span className="vv-wave-status">{posts.length<2?'One creation':cycle.reduced?'Reduced motion':paused||hover||focused?'Paused':`Next wave in ${Math.ceil(7*(1-cycle.progress))}s`}</span><span className="vv-wave-progress"><i style={{transform:`scaleX(${cycle.progress})`}}/></span><button type="button" aria-label={paused?'Play card rotation':'Pause card rotation'} aria-pressed={paused} onClick={()=>setPaused(value=>!value)} disabled={cycle.reduced||posts.length<2}>{paused?'▶':'Ⅱ'}</button><button type="button" onClick={()=>{next();cycle.reset();}} disabled={posts.length<2}>Next wave <Icon name="chevronRight"/></button></div>
 </div>;
}
export default function LatestCreations({posts,loading,error}){
 const [category,setCategory]=useState('all');
 const categories=[...new Set(posts.map(post=>post.category))];
 const pool=category==='all'?posts:posts.filter(post=>post.category===category);
 return <section className="vv-latest"><div className="vv-latest-heading"><div><p className="vv-home-eyebrow"><span/> THE LATEST ADDITIONS</p><h2>Worlds worth getting lost in.<i aria-hidden="true"/></h2></div><Link to="/explore" className="vv-home-secondary">Explore all creations <Icon name="arrowUpRight"/></Link></div>
 {categories.length>1&&<div className="vv-latest-filters" role="group" aria-label="Filter latest creations">{['all',...categories].map(value=><button key={value} type="button" aria-pressed={category===value} onClick={()=>setCategory(value)}>{value==='all'?'All additions':value}</button>)}</div>}
 {error?<p className="py-8 text-on-surface-variant">The archive is temporarily unavailable. Please try again shortly.</p>:loading?<div className="vv-wave-grid">{Array.from({length:4},(_,i)=><CardSkeleton key={i}/>)}</div>:pool.length?<PostWave key={category+pool.map(post=>post.id).join(',')} posts={pool}/>:<p className="py-8 text-on-surface-variant">No creations in this collection yet.</p>}
 </section>;
}
