import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router';
import ExploreHero from '../components/explore/ExploreHero';
import FilterBar from '../components/explore/FilterBar';
import ExploreGrid from '../components/explore/ExploreGrid';

import {useImageFeed} from '../lib/useImageFeed';
import {useApi} from '../lib/useApi';

function ImageFeed({category,search}) {
  const feed=useImageFeed(category,search);const navigate=useNavigate();
  if(feed.loading)return <div className="pt-6"><ExploreGrid loading/></div>;
  return <section className="pt-6" aria-label="Explore images">
    <p className="mb-6 text-sm text-on-surface-variant">{feed.items.length} images discovered</p>
    <ExploreGrid creations={feed.items} onCreationClick={image=>navigate('/creations/'+image.postId+'?image='+image.imageId)}/>
    <div className="py-8 text-center" aria-busy={Boolean(feed.loadingMore)}>{feed.loadingMore?<ExploreGrid loading/>:feed.error?<div role="alert"><p>{feed.error}</p><button type="button" onClick={()=>feed.next?feed.loadMore():window.location.reload()} className="mt-3 text-primary">Retry</button></div>:feed.next?<button type="button" onClick={feed.loadMore} className="rounded-full border border-primary/30 px-8 py-3 text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">See more</button>:feed.items.length>0?<p className="text-sm text-on-surface-variant">You have explored every matching image. Come back for new creations.</p>:null}</div>
  </section>;
}
export default function ExplorePage({searchQuery='',activeCategory,onCategoryChange}) {
  const {data}=useApi('/categories');
  const [search,setSearch]=useState(searchQuery);
  useEffect(()=>{const timer=setTimeout(()=>setSearch(searchQuery.trim().slice(0,200)),300);return()=>clearTimeout(timer);},[searchQuery]);
  return <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-16 sm:px-6 lg:px-10"><ExploreHero/><FilterBar activeCategory={activeCategory} onCategoryChange={onCategoryChange} customCategories={data?.categories??[]}/><ImageFeed key={activeCategory+':'+search} category={activeCategory} search={search}/></main>;
}
