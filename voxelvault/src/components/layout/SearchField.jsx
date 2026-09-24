import {useEffect,useId,useRef,useState} from 'react';
import {api} from '../../lib/api';
import AnimatedArtwork from '../ui/AnimatedArtwork';
import Icon from '../ui/Icon';
export default function SearchField({searchQuery='',onSearchChange,onFocusChange=()=>{},mobile=false}){
 const input=useRef(null);const listId=useId();
 const [value,setValue]=useState(searchQuery);const [focused,setFocused]=useState(false);const [hover,setHover]=useState(false);const [dismissed,setDismissed]=useState(false);const [selected,setSelected]=useState(-1);const [result,setResult]=useState({query:'',items:[]});
 const [submitted,setSubmitted]=useState(searchQuery);
 if(submitted!==searchQuery){setSubmitted(searchQuery);setValue(searchQuery);}
 const query=value.trim();
 const items=result.query===query?result.items:[];
 const show=focused&&!dismissed&&query.length>=2&&items.length>0;
 useEffect(()=>{if(query.length<2)return;const controller=new AbortController();const timer=setTimeout(()=>{api('/search/suggestions?q='+encodeURIComponent(query.slice(0,200)),{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setResult({query,items:data.items});}).catch(()=>{});},250);return()=>{clearTimeout(timer);controller.abort();};},[query]);
 function submit(e){e.preventDefault();const text=show&&selected>=0?items[selected].title:value;setValue(text);setDismissed(true);setSelected(-1);onSearchChange(text.trim());}
 return <form role="search" className={mobile?'vv-menu-search vv-search-with-suggestions':`vv-search vv-search-with-suggestions ${hover||focused?'vv-search-expanded':''}`} onSubmit={submit} onPointerEnter={()=>setHover(true)} onPointerLeave={()=>setHover(false)} onFocus={()=>{setFocused(true);onFocusChange(true);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setFocused(false);onFocusChange(false);}}}>
  {mobile?<Icon name="search"/>:<AnimatedArtwork name="search" active={hover||focused}/>}
  <label className="sr-only" htmlFor={listId+'-input'}>Search creations</label>
  <input ref={input} id={listId+'-input'} type="search" role="combobox" aria-autocomplete="list" aria-expanded={show} aria-controls={show?listId:undefined} aria-activedescendant={show&&selected>=0?`${listId}-${selected}`:undefined} autoComplete="off" enterKeyHint="search" maxLength={200} value={value} placeholder="Search worlds, builds…" onChange={e=>{setValue(e.target.value);setDismissed(false);setSelected(-1);}} onKeyDown={e=>{if(e.key==='Escape'){setDismissed(true);setSelected(-1);e.stopPropagation();}else if(show&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setSelected(current=>e.key==='ArrowDown'?(current+1)%items.length:(current<=0?items.length-1:current-1));}}}/>
  {mobile?<button type="submit" aria-label="Search"><Icon name="arrowUpRight"/></button>:!focused&&<button type="button" className="vv-search-trigger" aria-label="Open search" onClick={()=>{input.current?.focus();setDismissed(false);}}/>}
  {show&&<div className="vv-search-suggestions"><p>Suggestions <span>Enter to search</span></p><ul role="listbox" id={listId} aria-label="Search suggestions">{items.map((item,i)=><li key={item.id} id={`${listId}-${i}`} role="option" aria-selected={selected===i} onPointerDown={e=>e.preventDefault()} onClick={()=>{setValue(item.title);setDismissed(true);setSelected(-1);input.current?.focus();}}><Icon name="search"/><span>{item.title}<small>{item.category}</small></span><Icon name="arrowUpRight"/></li>)}</ul></div>}
 </form>;
}
