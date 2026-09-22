import { useEffect, useState } from 'react';

function Toast({ item, remove }) {
  const [paused, setPaused] = useState(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (paused || closing) return;
    const timer = setTimeout(() => setClosing(true), item.type === 'error' ? 9000 : 5000);
    return () => clearTimeout(timer);
  }, [paused, closing, item.type]);
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => remove(item.id), 220);
    return () => clearTimeout(timer);
  }, [closing, item.id, remove]);
  return <div onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPaused(false);}}
    className={`vault-toast ${closing ? 'vault-toast-out' : ''} ${item.type==='error' ? 'vault-toast-error' : ''}`}>
    <span aria-hidden="true" className="toast-icon">{item.type==='error'?'!':item.type==='info'?'i':'✓'}</span>
    <div className="min-w-0 flex-1" role={item.type==='error'?'alert':'status'}><p className="font-medium">{item.title || (item.type==='error'?'Something went wrong':item.type==='info'?'VoxelVault':'All set')}</p><p className="mt-1 break-words text-sm text-on-surface-variant">{item.message}</p></div>
    <button type="button" aria-label="Dismiss notification" onClick={()=>setClosing(true)} className="rounded-lg px-2 py-1 text-on-surface-variant hover:bg-white/10">×</button>
  </div>;
}
export default function Notifications() {
  const [items,setItems]=useState([]);
  useEffect(()=>{
    const listener=event=>setItems(current=>[...current,event.detail].slice(-3));
    window.addEventListener('voxelvault:notification',listener);
    return ()=>window.removeEventListener('voxelvault:notification',listener);
  },[]);
  return <aside aria-label="Notifications" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:bottom-6 sm:right-6">{items.map(item=><Toast key={item.id} item={item} remove={id=>setItems(current=>current.filter(x=>x.id!==id))} />)}</aside>;
}
