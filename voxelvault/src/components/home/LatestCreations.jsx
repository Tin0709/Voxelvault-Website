import {useCallback,useRef,useState} from 'react';
import {Link} from 'react-router';
import Icon from '../ui/Icon';
import WorldCard from './WorldCard';
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
   {wave.posts.map((post,i)=><WorldCard key={`${wave.number}-${post.id}`} post={post} className="vv-wave-card" style={{'--slot':i}}/>)}
  </div>
  <div className="vv-wave-toolbar"><span className="vv-wave-counter">WAVE {String(wave.number).padStart(2,'0')}</span><span className="vv-wave-status">{posts.length<2?'One creation':cycle.reduced?'Reduced motion':paused||hover||focused?'Paused':`Next wave in ${Math.ceil(7*(1-cycle.progress))}s`}</span><span className="vv-wave-progress"><i style={{transform:`scaleX(${cycle.progress})`}}/></span><button type="button" aria-label={paused?'Play card rotation':'Pause card rotation'} aria-pressed={paused} onClick={()=>setPaused(value=>!value)} disabled={cycle.reduced||posts.length<2}>{paused?'▶':'Ⅱ'}</button><button type="button" onClick={()=>{next();cycle.reset();}} disabled={posts.length<2}>Next wave <Icon name="chevronRight"/></button></div>
 </div>;
}
export default function LatestCreations({posts,loading,error}){
 const [category,setCategory]=useState('all');
 const categories=[...new Set(posts.map(post=>post.category))];
 const pool=category==='all'?posts:posts.filter(post=>post.category===category);
 return <section className="vv-latest"><div className="vv-latest-heading"><div><p className="vv-home-eyebrow"><span/> THE LATEST ADDITIONS</p><h2>Worlds worth getting lost in.<i aria-hidden="true"/></h2></div><Link to="/explore" className="vv-home-secondary">Explore all creations <Icon name="arrowUpRight"/></Link></div>
 {categories.length>1&&<><label className="vv-latest-category-select">Category<select value={category} onChange={e=>setCategory(e.target.value)}>{['all',...categories].map(value=><option key={value} value={value}>{value==='all'?'All additions':value}</option>)}</select></label><div className="vv-latest-filters" role="group" aria-label="Filter latest creations">{['all',...categories].map(value=><button key={value} type="button" aria-pressed={category===value} onClick={()=>setCategory(value)}>{value==='all'?'All additions':value}</button>)}</div></>}
 {error?<p className="py-8 text-on-surface-variant">The archive is temporarily unavailable. Please try again shortly.</p>:loading?<div className="vv-wave-grid">{Array.from({length:4},(_,i)=><CardSkeleton key={i}/>)}</div>:pool.length?<PostWave key={category+pool.map(post=>post.id).join(',')} posts={pool}/>:<p className="py-8 text-on-surface-variant">No creations in this collection yet.</p>}
 </section>;
}
