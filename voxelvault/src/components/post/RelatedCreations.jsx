import {useMemo} from 'react';
import WorldCard from '../home/WorldCard';
import {CardSkeleton} from '../explore/ExploreCard';
import {useApi} from '../../lib/useApi';
function choose(posts,creation){
 const pool=posts.filter(p=>p.id!==creation.id);
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return [...pool.filter(p=>p.category===creation.category),...pool.filter(p=>p.category!==creation.category)].slice(0,4);
}
export default function RelatedCreations({creation}){
 const {data,loading,error}=useApi('/posts');
 const posts=useMemo(()=>choose(data?.posts??[],creation),[data,creation]);
 return <section className="mt-14 border-t border-white/10 pt-10"><p className="text-xs uppercase tracking-[.2em] text-primary">Keep exploring</p><h2 className="mt-3 text-3xl">More worlds to discover</h2><div className="vv-wave-grid mt-7">{loading?Array.from({length:4},(_,i)=><CardSkeleton key={i}/>):posts.map(post=><WorldCard key={post.id} post={post}/>)}</div>{error&&<p role="alert">Suggestions could not load. Please refresh to retry.</p>}{!loading&&!error&&!posts.length&&<p className="mt-4 text-on-surface-variant">More creations will appear here as the community grows.</p>}</section>;
}
