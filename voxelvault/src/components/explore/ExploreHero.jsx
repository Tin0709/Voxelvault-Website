import {useCallback,useRef,useState} from 'react';
import {useMotionCycle} from '../../lib/useMotionCycle';
const quotes=[
 {first:'Small blocks.',accent:'Endless possibilities.',description:'Explore extraordinary Minecraft worlds, discover your next inspiration, and find a creation to make your own.'},
 {first:'Follow your curiosity.',accent:'Find your next world.',description:'From quiet landscapes to extraordinary castles, discover the details that spark your imagination.'},
 {first:'Every world has a story.',accent:'Discover something new.',description:'Meet the creations of a passionate community. Look closer, explore their galleries, and see where inspiration takes you.'},
];
export default function ExploreHero(){
 const element=useRef(null);const [index,setIndex]=useState(0);
 const next=useCallback(()=>setIndex(current=>(current+1)%quotes.length),[]);
 const cycle=useMotionCycle({element,duration:7500,onCycle:next});const quote=quotes[index];
 return <section ref={element} aria-labelledby="explore-heading" className={`vv-explore-quote pb-12 pt-14 sm:pt-16 ${cycle.progress>.9?'vv-quote-leaving':''}`} style={{'--cycle-state':cycle.active?'running':'paused'}}>
  <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">A curated world of blocks</p>
  <div className="vv-explore-quote-stage"><h1 key={index} id="explore-heading" aria-label={`${quote.first} ${quote.accent}`} className="mt-4 max-w-4xl font-headline-lg text-4xl leading-tight tracking-tight sm:text-6xl"><span className="vv-quote-line" aria-hidden="true">{quote.first.split(' ').map((word,i)=><span key={i} style={{'--word':i}}>{word} </span>)}</span><span className="vv-quote-line text-primary" aria-hidden="true">{quote.accent.split(' ').map((word,i)=><span key={i} style={{'--word':i+quote.first.split(' ').length}}>{word} </span>)}</span></h1></div>
  <p className="vv-explore-quote-description mt-6 max-w-xl text-base leading-relaxed text-on-surface-variant">{quote.description}</p>
 </section>;
}
