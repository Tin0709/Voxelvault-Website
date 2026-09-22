import { useState } from 'react';
import Icon from '../ui/Icon';

export default function CategoryPicker({ value, options, onChange }) {
  const [adding,setAdding]=useState(false);
  const [custom,setCustom]=useState('');
  const [local,setLocal]=useState([]);
  const categories=[...new Set([...options,...local,value].filter(Boolean))];
  function add() {
    const name=custom.trim();
    if(!name)return;
    const existing=categories.find(c=>c.toLowerCase()===name.toLowerCase());
    const selected=existing || name;
    setLocal(current=>[...current,selected]);onChange(selected);setCustom('');setAdding(false);
  }
  return <div className="space-y-3"><p className="text-sm font-medium">Category</p>
    <div role="group" aria-label="Post category" className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-2">{categories.map(category=><button type="button" key={category} aria-pressed={value===category} onClick={()=>onChange(category)} className={`inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm ${value===category?'border-primary/40 bg-primary/15 text-primary':'border-white/10 bg-black/20 text-on-surface-variant hover:border-primary/40'}`}>{value===category&&<Icon name="check" className="!h-4 !w-4"/>}<span className="break-words">{category}</span></button>)}
    <button type="button" onClick={()=>setAdding(!adding)} aria-expanded={adding} className="inline-flex items-center gap-2 rounded-full border border-dashed border-primary/40 px-4 py-2 text-sm text-primary"><Icon name="plus" className="!h-4 !w-4"/>New category</button></div>
    {adding&&<div className="vault-preview flex flex-wrap gap-2 rounded-xl bg-black/20 p-3"><label className="min-w-0 flex-1"><span className="sr-only">New category name</span><input autoFocus maxLength={80} value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}if(e.key==='Escape'){e.preventDefault();setAdding(false);}}} className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm" placeholder="e.g. 3D models"/></label><button type="button" disabled={!custom.trim()} onClick={add} className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50">Add</button></div>}
    <p className="text-xs text-on-surface-variant">New categories are saved with your post.</p>
  </div>;
}
