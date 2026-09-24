import {useCallback,useRef,useState} from 'react';
import {Link} from 'react-router';
import Icon from '../ui/Icon';
import {useMotionCycle} from '../../lib/useMotionCycle';
const quotes=[
 {tag:'A HOME FOR EXTRAORDINARY WORLDS',first:'Built block by block.',accent:'Kept forever.',description:'Great worlds start with a little imagination. Discover remarkable builds, share the story behind yours, and give your creations a place to belong.'},
 {tag:'SMALL BLOCKS. LIMITLESS IMAGINATION.',first:'From single voxels.',accent:'To infinite spires.',description:'Every extraordinary world starts with a single block. Find a new perspective, discover remarkable builds, and imagine what comes next.'},
 {tag:'A PLACE FOR EVERY CREATOR',first:'Crafted in silence.',accent:'Shared with the world.',description:'Give your ideas a home. Tell the story behind your creation, celebrate the details, and inspire someone to start building.'},
];
export default function HeroQuote(){
 const element=useRef(null);const [index,setIndex]=useState(0);const [paused,setPaused]=useState(false);const next=useCallback(()=>setIndex(i=>(i+1)%quotes.length),[]);
 const cycle=useMotionCycle({element,duration:7500,onCycle:next,paused});
 const quote=quotes[index];const leaving=cycle.progress>.9&&!paused;
 return <div ref={element} className={`vv-home-intro vv-quote ${leaving?'vv-quote-leaving':''}`} style={{'--cycle-state':cycle.active?'running':'paused'}}>
  <p className="vv-quote-tag"><span/>{quote.tag}</p>
  <div className="vv-quote-stage"><h1 key={index} aria-label={quote.first+' '+quote.accent}><span aria-hidden="true" className="vv-quote-line">{quote.first.split(' ').map((word,i)=><span key={i} style={{'--word':i}}>{word} </span>)}</span><em aria-hidden="true" className="vv-quote-line">{quote.accent.split(' ').map((word,i)=><span key={i} style={{'--word':i+quote.first.split(' ').length}}>{word} </span>)}</em></h1></div>
  <p className="vv-home-description vv-quote-description">{quote.description}</p>
  <div className="vv-quote-controls"><div><span>INSPIRATION <b>{String(index+1).padStart(2,'0')} / 03</b></span><button type="button" aria-label={paused?'Play quotes':'Pause quotes'} aria-pressed={paused} onClick={()=>setPaused(value=>!value)} disabled={cycle.reduced}>{cycle.reduced?'Reduced motion':paused?'▶ Play':'Ⅱ Pause'}</button></div><div className="vv-quote-segments">{quotes.map((item,i)=><button key={item.first} type="button" aria-label={`Quote ${i+1}: ${item.first}`} aria-pressed={index===i} onClick={()=>{setIndex(i);cycle.reset();}}><span style={{transform:`scaleX(${index===i?cycle.reduced?1:Math.max(.025,cycle.progress):0})`}}/></button>)}</div></div>
  <div className="flex flex-wrap gap-3"><Link to="/explore" className="vv-home-primary">Enter the archive <Icon name="arrowUpRight"/></Link><Link to="/create" className="vv-home-secondary">Share a creation <Icon name="plus"/></Link></div><div className="vv-home-note"><Icon name="cube"/><span>YOUR IDEAS. YOUR WORLDS. YOUR VAULT.</span></div>
 </div>;
}

