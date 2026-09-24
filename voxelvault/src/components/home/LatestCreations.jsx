import {useState} from 'react';
import {Link} from 'react-router';
import Icon from '../ui/Icon';
import HomeImage from './HomeImage';
import {CardSkeleton} from '../explore/ExploreCard';
export default function LatestCreations({posts,loading,error}){
 const [category,setCategory]=useState('all');
 const categories=[...new Set(posts.map(post=>post.category))];
 const visible=category==='all'?posts:posts.filter(post=>post.category===category);
 return <section className="vv-latest"><div className="vv-latest-heading"><div><p className="vv-home-eyebrow"><span/> THE LATEST ADDITIONS</p><h2>Worlds worth getting lost in.<i aria-hidden="true"/></h2></div><Link to="/explore" className="vv-home-secondary">Explore all creations <Icon name="arrowUpRight"/></Link></div>
 {categories.length>1&&<div className="vv-latest-filters" role="group" aria-label="Filter latest creations">{['all',...categories].map(value=><button key={value} type="button" aria-pressed={category===value} onClick={()=>setCategory(value)}>{value==='all'?'All additions':value}</button>)}</div>}
 {error?<p className="py-8 text-on-surface-variant">The archive is temporarily unavailable. Please try again shortly.</p>:<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{loading?Array.from({length:4},(_,i)=><CardSkeleton key={i}/>):visible.map(post=><article key={post.id} className="vv-latest-card"><Link to={`/creations/${post.id}`} className="vv-latest-image" aria-label={`View ${post.title}`}><HomeImage key={post.image} src={post.image} alt={post.alt||post.title}/><span className="vv-latest-badge">{post.gallery.length} {post.gallery.length===1?'IMAGE':'IMAGES'}</span><span className="vv-latest-inspect">View creation <Icon name="arrowUpRight"/></span></Link><div className="vv-latest-copy"><p>{post.category}</p><h3><Link to={`/creations/${post.id}`}>{post.title}</Link></h3><span>By <Link to={`/creators/${post.creatorId}`}>{post.creator}</Link></span></div></article>)}</div>}
 {!loading&&!error&&!visible.length&&<p className="py-8 text-on-surface-variant">No creations in this collection yet.</p>}
 </section>;
}
