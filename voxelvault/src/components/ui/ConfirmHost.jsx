import { useEffect, useRef, useState } from 'react';
export default function ConfirmHost() {
  const [requests,setRequests]=useState([]);
  const dialog=useRef(null);
  const current=requests[0];
  useEffect(()=>{const handler=e=>setRequests(items=>[...items,e.detail]);window.addEventListener('vault:confirm',handler);return()=>window.removeEventListener('vault:confirm',handler);},[]);
  useEffect(()=>{if(current)dialog.current?.showModal();else dialog.current?.close();},[current]);
  function done(value){current?.resolve(value);setRequests(items=>items.slice(1));}
  return <dialog ref={dialog} onCancel={e=>{e.preventDefault();done(false);}} className="vault-dialog">
    {current&&<div className="p-7"><h2 className="text-xl font-semibold">{current.title}</h2><p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{current.message}</p><div className="mt-7 flex justify-end gap-3"><button autoFocus type="button" onClick={()=>done(false)} className="rounded-full border border-white/20 px-5 py-2.5">Cancel</button><button type="button" onClick={()=>done(true)} className="rounded-full bg-red-300 px-5 py-2.5 text-black">Confirm removal</button></div></div>}
  </dialog>;
}
