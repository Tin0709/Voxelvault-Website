import {useState} from 'react';
import {Link} from 'react-router';
import Icon from '../ui/Icon';
export function CardSkeleton({mediaOnly=false}){return <div className={`vv-skeleton ${mediaOnly?'vv-skeleton-media':''}`} aria-label="Loading image" role="status"><div className="vv-skeleton-picture"><span className="vv-skeleton-cube"><Icon name="cube" className="!h-10 !w-10"/></span><span className="text-[10px] uppercase tracking-[.15em] text-primary">Discovering voxels…</span></div>{!mediaOnly&&<div className="p-5"><div className="vv-bone w-3/4"/><div className="vv-bone mt-3 w-full"/><div className="vv-bone mt-3 w-1/2"/><div className="vv-bone mt-7 w-2/3"/></div>}</div>;}
export default function ExploreCard({creation,onOpen,touchTitle=false,editable=false}){
 const [state,setState]=useState('loading');
 return <article data-card-id={creation.id} data-touch-title={touchTitle} className={`vv-explore-card ${editable?'vv-my-post-card relative':''}`}><button type="button" onClick={()=>onOpen(creation)} className="block w-full text-left" aria-label={`View ${creation.title}`}>
  <div className={`vv-card-image ${state==='loading'?'vv-image-pending':''}`}>
   {state==='loading'&&<CardSkeleton mediaOnly/>}
   {state==='error'?<div className="flex aspect-[4/3] items-center justify-center text-sm text-on-surface-variant"><Icon name="image" className="mr-2"/>Image unavailable</div>:<img src={creation.image} alt={creation.alt||creation.title} loading="lazy" onLoad={()=>setState('ready')} onError={()=>setState('error')} className={state==='loading'?'opacity-0':'opacity-100'}/>}
   <span className="vv-card-sheen"/><span className="vv-card-category">{creation.category}</span>{!editable&&<span className="vv-card-open"><Icon name="eye"/></span>}
  </div>
  <div className="vv-card-caption p-4"><h2 className="break-words font-headline-lg text-lg leading-snug">{creation.title}</h2><div className="vv-card-creator mt-3 flex items-center gap-2 text-xs text-on-surface-variant">{creation.creatorAvatar?<img src={creation.creatorAvatar} alt="" className="h-7 w-7 rounded-full object-cover"/>:<span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">{creation.creator?.slice(0,1)}</span>}<span>{creation.creator}</span></div></div>
  <div className="vv-card-details"><div><div className="mx-4 border-t border-white/10 pb-4 pt-3"><p className="line-clamp-3 text-xs leading-relaxed text-on-surface-variant">{creation.description||'The creator has not added a description yet.'}</p><span className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs text-primary"><Icon name="eye" className="!h-4 !w-4"/>View creation <span>↗</span></span></div></div></div>
 </button>{editable&&<Link to={`/creations/${encodeURIComponent(creation.id)}/edit`} aria-label={`Edit post: ${creation.title}`} onClick={event=>event.stopPropagation()} className="vv-my-post-edit"><Icon name="edit"/></Link>}</article>;
}
