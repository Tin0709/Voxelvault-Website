import PostFeedCard from '../components/explore/PostFeedCard';
import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router';
import ExploreHero from '../components/explore/ExploreHero';
import FilterBar from '../components/explore/FilterBar';
import ExploreGrid from '../components/explore/ExploreGrid';

import {useImageFeed} from '../lib/useImageFeed';
import {useApi} from '../lib/useApi';

function ImageFeed({category,search,view}) {
  const feed=useImageFeed(category,search,view);const navigate=useNavigate();
  if(feed.loading)return <div className="pt-6"><ExploreGrid loading/></div>;
  return <section className="pt-6" aria-label={view==='posts'?'Explore posts':'Explore images'}>
    <p className="mb-6 text-sm text-on-surface-variant">{feed.items.length} {view==='posts'?'posts':'images'} discovered</p>
    {feed.items.length===0?(!feed.error&&<p className="py-16 text-center text-on-surface-variant">No matching {view==='posts'?'posts':'images'}. Try another category or keyword.</p>):view==='posts'?<div className="mx-auto max-w-4xl space-y-8">{feed.items.map(post=><PostFeedCard key={post.id} post={post}/>)}{feed.loadingMore&&<ExploreGrid loading/>}</div>:<ExploreGrid loadingMore={feed.loadingMore} creations={feed.items} onCreationClick={image=>navigate('/creations/'+image.postId+'?image='+image.imageId)}/>}
    <div className="py-8 text-center" aria-busy={Boolean(feed.loadingMore)}>{feed.loadingMore?<p role="status" className="text-primary">Loading more…</p>:feed.error?<div role="alert"><p>{feed.error}</p><button type="button" onClick={feed.retry} className="mt-3 text-primary">Retry</button></div>:feed.next?<button type="button" onClick={feed.loadMore} className="rounded-full border border-primary/30 px-8 py-3 text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">See more</button>:feed.items.length>0?<p className="text-sm text-on-surface-variant">You have explored every matching {view==='posts'?'post':'image'}. Come back for new creations.</p>:null}</div>
  </section>;
}
export default function ExplorePage({searchQuery='',activeCategory,onCategoryChange}) {
  const [view,setView]=useState('images');
  const {data}=useApi('/categories');
  const [search,setSearch]=useState(searchQuery);
  useEffect(()=>{const timer=setTimeout(()=>setSearch(searchQuery.trim().slice(0,200)),300);return()=>clearTimeout(timer);},[searchQuery]);
  return <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-16 sm:px-6 lg:px-10"><ExploreHero/><FilterBar activeCategory={activeCategory} onCategoryChange={onCategoryChange} customCategories={data?.categories??[]}/><div className="mt-5 flex justify-end"><button type="button" role="switch" aria-checked={view==='posts'} onClick={()=>setView(view==='posts'?'images':'posts')} className="flex items-center gap-3 rounded-full border border-primary/25 px-4 py-2.5 text-sm"><span>View as posts</span><span className={'relative h-6 w-11 rounded-full transition-colors '+(view==='posts'?'bg-primary':'bg-white/15')}><span className={'absolute left-0 top-1 h-4 w-4 rounded-full bg-white transition-transform '+(view==='posts'?'translate-x-6':'translate-x-1')}/></span></button></div><ImageFeed key={activeCategory+':'+search+':'+view} category={activeCategory} search={search} view={view}/></main>;
}
