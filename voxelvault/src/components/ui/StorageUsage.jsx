import {useEffect,useRef,useState} from 'react';
import {useApi} from '../../lib/useApi';
import {formatBytes} from '../../utils/attachments';
import LoadingState from './LoadingState';
import Icon from './Icon';
import {api} from '../../lib/api';
import {confirmAction} from '../../lib/confirm';
import {notify} from '../../lib/notifications';

const labels={postImages:'Post images',attachments:'Private attachments',profileImages:'Avatar & cover',unattached:'Uploaded, not attached to a post',pending:'Upload reservations',deleting:'Waiting for deletion'};
export default function StorageUsage(){
  const [open,setOpen]=useState(false);
  const [revision,setRevision]=useState(0);
  const summary=useApi(`/me/storage?refresh=${revision}`);
  const [busy,setBusy]=useState(null);
  const [actionError,setActionError]=useState('');
  const [filter,setFilter]=useState('all');
  const details=useApi(open?`/me/storage/details?refresh=${revision}`:null);
  const dialog=useRef(null);
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
  const data=details.data||summary.data;
  async function remove(item){
    if(busy)return;
    if(!await confirmAction(`Permanently delete ${item.name} (${formatBytes(item.bytes)})? This cannot be undone. An unfinished editor using this upload will need to upload it again.`, 'Delete unused upload'))return;
    setBusy(item.id);setActionError('');
    try{await api(`/me/storage/uploads/${item.id}`,{method:'DELETE'});notify('Unused upload removed and storage released.','success','File deleted');}
    catch(error){setActionError(error.message);}
    finally{setBusy(null);setRevision(n=>n+1);}
  }
  return <>
    <button type="button" onClick={()=>{setRevision(n=>n+1);setOpen(true);}} className="mt-6 flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-on-surface-variant transition hover:border-primary/40 hover:bg-primary/5" aria-haspopup="dialog">
      <span>{summary.error|| (data?`Storage used or reserved: ${formatBytes(data.usedBytes)} / ${formatBytes(data.quotaBytes)}`:'Loading storage usage…')}</span><span className="inline-flex shrink-0 items-center gap-2 text-primary"><span className="hidden sm:inline">View details</span><Icon name="info"/></span>
    </button>
    <dialog ref={dialog} className="vault-dialog !w-[min(720px,calc(100%-32px))]" aria-labelledby="storage-title" onCancel={()=>setOpen(false)}>
      <div className="p-5 sm:p-7"><div className="flex items-center justify-between gap-4"><h2 id="storage-title" className="text-xl">Storage breakdown</h2><button autoFocus type="button" aria-label="Close storage details" onClick={()=>setOpen(false)} className="rounded-full border border-white/15 p-2"><Icon name="close"/></button></div>
        {details.loading?<LoadingState label="Checking your storage…"/>:details.error?<div role="alert" className="mt-5"><p>{details.error}</p><button className="mt-3 text-primary" onClick={()=>setRevision(n=>n+1)}>Retry</button></div>:details.data&&<>
          <p className="mt-5 text-2xl text-primary">{formatBytes(details.data.usedBytes)} <span className="text-sm text-on-surface-variant">/ {formatBytes(details.data.quotaBytes)}</span></p>
          <div className="my-5 grid gap-2 sm:grid-cols-2">{Object.entries(labels).map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} onClick={()=>setFilter(filter===key?'all':key)} className={`rounded-xl border p-3 text-left ${filter===key?'border-primary bg-primary/10':'border-white/10 bg-white/[0.03]'}`}><span className="block text-xs text-on-surface-variant">{label}</span><span className="mt-1 block text-primary">{formatBytes(details.data.groups[key].bytes)} <span className="text-xs text-on-surface-variant">· {details.data.groups[key].count} files</span></span></button>)}</div>
          <p className="text-xs leading-relaxed text-on-surface-variant">Unattached uploads can remain after an interrupted or unpublished save. They still occupy storage and count toward your limit. Eligible unused uploads are cleaned by the server after 24 hours when cleanup runs. Deletions count until storage confirms removal.</p>
          <p className="mt-2 text-xs text-on-surface-variant">Local browser drafts and external download links do not count. MB uses 1,000,000 bytes.</p>
          <div className="mt-5 flex items-center justify-between"><h3 className="text-sm">{filter==='all'?'All files, largest first':labels[filter]}</h3>{filter!=='all'&&<button className="text-sm text-primary" onClick={()=>setFilter('all')}>Show all</button>}</div>
          {actionError&&<p role="alert" className="mt-3 text-sm text-red-300">{actionError}</p>}
          <ul className="mt-3 max-h-[50vh] overflow-y-auto divide-y divide-white/10">{details.data.items.filter(item=>filter==='all'||item.group===filter).map(item=><StorageFile key={item.id} item={item} busy={busy} remove={remove}/>)}</ul>
          {!details.data.items.some(item=>filter==='all'||item.group===filter)&&<p className="py-4 text-sm text-on-surface-variant">No files in this category.</p>}
        </>}
      </div>
    </dialog>
  </>;
}

function StorageFile({item,busy,remove}){
  const [size,setSize]=useState('');
  const [failed,setFailed]=useState(false);
  return <li className="py-4">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm">{item.name}</p><p className="mt-1 text-xs text-on-surface-variant">{labels[item.group]} · {item.provider==='r2'?'R2':'Supabase'}</p><p className="mt-1 text-xs text-on-surface-variant">{item.bytes.toLocaleString()} bytes{size&&` · ${size}`}{item.createdAt&&` · ${new Date(item.createdAt).toLocaleString()}`}</p></div><span className="shrink-0 text-sm text-primary">{formatBytes(item.bytes)}</span></div>
    {item.previewUrl&&<details className="mt-3"><summary className="cursor-pointer text-sm text-primary">Preview image</summary>{failed?<p className="mt-3 text-sm text-on-surface-variant">Preview unavailable.</p>:<img src={item.previewUrl} alt={item.name} loading="lazy" onLoad={e=>setSize(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} px`)} onError={()=>setFailed(true)} className="mt-3 max-h-64 w-full rounded-xl bg-black/20 object-contain"/>}<a href={item.previewUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary">Open original ↗</a></details>}
    {['unattached','deleting'].includes(item.group)&&<button type="button" disabled={Boolean(busy)} onClick={()=>remove(item)} className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-300/30 px-3 py-2 text-xs text-red-300 disabled:opacity-50"><Icon name="trash"/>{busy===item.id?'Deleting…':item.group==='deleting'?'Retry deletion':'Delete unused file'}</button>}
  </li>;
}
