import {useEffect,useId,useRef,useState} from 'react';
import {api} from '../../lib/api';
import AnimatedArtwork from '../ui/AnimatedArtwork';
import Icon from '../ui/Icon';
const HISTORY_KEY='voxelvault.searchHistory';
function readHistory(){
 try{const data=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(data)?[...new Set(data.filter(value=>typeof value==='string'&&value.trim()&&value.length<=200))].slice(0,8):[];}catch{return [];}
}
export default function SearchField({searchQuery='',onSearchChange,onFocusChange=()=>{},mobile=false}){
 const input=useRef(null);const listId=useId();
 const [value,setValue]=useState(searchQuery);const [focused,setFocused]=useState(false);const [hover,setHover]=useState(false);const [dismissed,setDismissed]=useState(false);const [selected,setSelected]=useState(-1);const [result,setResult]=useState({query:'',items:[]});
 const [history,setHistory]=useState(readHistory);
 const [submitted,setSubmitted]=useState(searchQuery);
 if(submitted!==searchQuery){setSubmitted(searchQuery);setValue(searchQuery);}
 const query=value.trim();
 const historyMode=query.length<2;
 const items=historyMode?history.filter(text=>text.toLowerCase().includes(query.toLowerCase())).map(title=>({id:title,title})):result.query===query?result.items:[];
 const show=focused&&!dismissed;
 useEffect(()=>{const refresh=()=>setHistory(readHistory());window.addEventListener('storage',refresh);window.addEventListener('vv-search-history',refresh);return()=>{window.removeEventListener('storage',refresh);window.removeEventListener('vv-search-history',refresh);};},[]);
 useEffect(()=>{if(query.length<2)return;const controller=new AbortController();const timer=setTimeout(()=>{api('/search/suggestions?q='+encodeURIComponent(query.slice(0,200)),{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setResult({query,items:data.items});}).catch(()=>{if(!controller.signal.aborted)setResult({query,items:[],failed:true});});},250);return()=>{clearTimeout(timer);controller.abort();};},[query]);
 function saveHistory(next){setHistory(next);try{localStorage.setItem(HISTORY_KEY,JSON.stringify(next));window.dispatchEvent(new Event('vv-search-history'));}catch{/* Search remains available when browser storage is disabled. */}}
 function submit(e){e.preventDefault();const text=(show&&selected>=0?items[selected]?.title??value:value).trim();setValue(text);setDismissed(true);setSelected(-1);if(text)saveHistory([text,...history.filter(item=>item.toLowerCase()!==text.toLowerCase())].slice(0,8));onSearchChange(text);}
 return <form role="search" className={mobile?'vv-menu-search vv-search-with-suggestions':`vv-search vv-search-with-suggestions ${hover||focused?'vv-search-expanded':''}`} onSubmit={submit} onPointerEnter={()=>setHover(true)} onPointerLeave={()=>setHover(false)} onFocus={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDismissed(false);setFocused(true);onFocusChange(true);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setFocused(false);onFocusChange(false);}}}>
  {mobile?<Icon name="search"/>:<AnimatedArtwork name="search" active={hover||focused}/>}
  <label className="sr-only" htmlFor={listId+'-input'}>Search creations</label>
  <input ref={input} id={listId+'-input'} type="search" role="combobox" aria-autocomplete="list" aria-expanded={show} aria-controls={show?listId:undefined} aria-activedescendant={show&&items[selected]?`${listId}-${selected}`:undefined} autoComplete="off" enterKeyHint="search" maxLength={200} value={value} placeholder="Search worlds, builds…" onClick={()=>setDismissed(false)} onChange={e=>{setValue(e.target.value);setDismissed(false);setSelected(-1);}} onKeyDown={e=>{if(e.key==='Escape'){setDismissed(true);setSelected(-1);e.stopPropagation();}else if(show&&items.length&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setSelected(current=>e.key==='ArrowDown'?(current+1)%items.length:(current<=0?items.length-1:current-1));}}}/>
  {value&&(mobile||focused||hover)&&<button type="button" className="vv-search-clear" aria-label="Clear search" onClick={()=>{setValue('');setSelected(-1);setDismissed(false);input.current?.focus();}}><Icon name="close"/></button>}
  {mobile?<button type="submit" aria-label="Search"><Icon name="arrowUpRight"/></button>:!focused&&<button type="button" className="vv-search-trigger" aria-label="Open search" onClick={()=>{input.current?.focus();setDismissed(false);}}/>}
  {show&&<div className="vv-search-suggestions"><p>{historyMode?'Recent searches':'Suggestions'}<span>Enter to search</span></p><ul role="listbox" id={listId} aria-label={historyMode?'Search history':'Search suggestions'}>{items.map((item,i)=><li key={item.id} id={`${listId}-${i}`} role="option" aria-selected={selected===i} onPointerDown={e=>e.preventDefault()} onClick={()=>{setValue(item.title);setDismissed(true);setSelected(-1);input.current?.focus();}}><Icon name={historyMode?'archive':'search'}/><span>{item.title}{item.category&&<small>{item.category}</small>}</span><Icon name="arrowUpRight"/></li>)}</ul>{!items.length&&<div className="vv-search-empty" role="status">{historyMode?'Your recent searches will appear here.':result.query!==query?'Finding suggestions…':result.failed?'Suggestions are unavailable. Press Enter to search.':'No suggestions yet. Press Enter to search.'}</div>}{historyMode&&history.length>0&&<button type="button" className="vv-search-history-clear" onClick={()=>{saveHistory([]);setSelected(-1);input.current?.focus();}}>Clear search history</button>}</div>}
 </form>;
}
