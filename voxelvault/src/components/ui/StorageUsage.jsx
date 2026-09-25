import {useEffect,useRef,useState} from 'react';
import {useApi} from '../../lib/useApi';
import {formatBytes} from '../../utils/attachments';
import LoadingState from './LoadingState';
import Icon from './Icon';
import {api} from '../../lib/api';
import {confirmAction} from '../../lib/confirm';
import {notify} from '../../lib/notifications';
import {cleanUnusedUploads} from '../../lib/storageCleanup';
import ProgressBar from './ProgressBar';

const labels={postImages:'Post images',attachments:'Private attachments',profileImages:'Avatar & cover',unattached:'Uploaded, not attached to a post',pending:'Upload reservations',deleting:'Waiting for deletion'};
const colors={postImages:'#68dba9',attachments:'#22d3ee',profileImages:'#a5a0ff',unattached:'#fbbf24',pending:'#94a3b8',deleting:'#fca5a5'};
const descriptions={postImages:'Images published with your posts',attachments:'Files available only to their owner',profileImages:'Your profile photo and background',unattached:'Review and remove uploads you no longer need',pending:'Space reserved for uploads in progress',deleting:'Space released after storage confirms deletion'};
export default function StorageUsage(){
  const [open,setOpen]=useState(false);
  const [revision,setRevision]=useState(0);
  const summary=useApi(`/me/storage/details?refresh=${revision}`);
  const [busy,setBusy]=useState(null);
  const [actionError,setActionError]=useState('');
  const [filter,setFilter]=useState('unattached');
  const [batchProgress,setBatchProgress]=useState(null);
  const [resultMessage,setResultMessage]=useState('');
  const operation=useRef(false);
  const details=summary;
  const dialog=useRef(null);
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
  const data=details.data||summary.data;
  const unused=details.data?.items.filter(item=>['unattached','deleting'].includes(item.group))||[];
  const cleanBytes=unused.reduce((sum,item)=>sum+item.bytes,0);
  async function removeAll(){
    if(operation.current||!unused.length)return;
    operation.current=true;
    const snapshot=[...unused];
    try{
      if(!await confirmAction(`Permanently delete all ${snapshot.length} unused files (${formatBytes(cleanBytes)})? Published post files and profile images are excluded. This cannot be undone. Unfinished editors may need to upload these files again.`, 'Delete all unused files'))return;
      setBusy('batch');setActionError('');setResultMessage('');setBatchProgress(0);
      const result=await cleanUnusedUploads(snapshot,id=>api(`/me/storage/uploads/${id}`,{method:'DELETE'}),(done,total)=>setBatchProgress(done/total*100));
      const message=`${result.deleted} files deleted · ${formatBytes(result.bytes)} released.`;
      setResultMessage(message);notify(message,result.failures.length?'info':'success','Storage cleanup');
      if(result.failures.length)setActionError(`${result.failures.length} files could not be deleted. ${result.failures.map(file=>`${file.name}: ${file.message}`).join(' ')}`);
      setRevision(n=>n+1);
    }finally{operation.current=false;setBusy(null);setBatchProgress(null);}
  }
  async function remove(item){
    if(operation.current)return;
    operation.current=true;
    if(!await confirmAction(`Permanently delete ${item.name} (${formatBytes(item.bytes)})? This cannot be undone. An unfinished editor using this upload will need to upload it again.`, 'Delete unused upload')){operation.current=false;return;}
    setBusy(item.id);setActionError('');
    try{await api(`/me/storage/uploads/${item.id}`,{method:'DELETE'});notify('Unused upload removed and storage released.','success','File deleted');}
    catch(error){setActionError(error.message);}
    finally{operation.current=false;setBusy(null);setRevision(n=>n+1);}
  }
  return <>
    <StorageOverview data={data} error={summary.error} onOpen={()=>{setRevision(n=>n+1);setOpen(true);}}/>
    <dialog onClick={e=>{if(e.target!==e.currentTarget||busy)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setOpen(false);}} ref={dialog} className="vault-dialog !w-[min(900px,calc(100%-24px))] !bg-[#111214]" aria-labelledby="storage-title" onCancel={e=>{if(busy)e.preventDefault();else setOpen(false);}}>

      <div className="p-5 sm:p-8"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-white/10 pb-5"><div className="flex min-w-0 items-start gap-3"><span className="hidden shrink-0 rounded-xl sm:inline-flex border border-primary/20 bg-primary/5 p-3 text-primary"><Icon name="archive"/></span><div><h2 id="storage-title" className="font-headline-lg text-xl sm:text-2xl">Storage breakdown</h2><p className="mt-1 text-xs text-on-surface-variant">Review your files and make room for new creations.</p></div></div><button autoFocus type="button" disabled={Boolean(busy)} aria-label="Close storage details" onClick={()=>setOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center justify-self-end rounded-xl border border-white/15 disabled:opacity-40"><Icon name="close"/></button></div>
        {details.loading?<LoadingState label="Checking your storage…"/>:details.error?<div role="alert" className="mt-5"><p>{details.error}</p><button className="mt-3 text-primary" onClick={()=>setRevision(n=>n+1)}>Retry</button></div>:details.data&&<>
          <div className="my-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-on-surface-variant">Total used or reserved</p><p className="mt-2 font-mono text-3xl">{formatBytes(details.data.usedBytes)} <span className="text-sm text-on-surface-variant">/ {formatBytes(details.data.quotaBytes)}</span></p></div><div className="text-sm"><p className={details.data.usedBytes>=details.data.quotaBytes*.85?'text-amber-300':'text-primary'}>{details.data.quotaBytes?Math.round(details.data.usedBytes/details.data.quotaBytes*100):0}% used</p><p className="mt-1 text-xs text-on-surface-variant">Available: {formatBytes(Math.max(0,details.data.quotaBytes-details.data.usedBytes))}</p></div></div>
          <StorageMeter key={open?"open":"closed"} data={details.data}/>
          <div className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(labels).map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} onClick={()=>setFilter(filter===key?'all':key)} style={{borderColor:filter===key?colors[key]:undefined}} className={`rounded-xl border p-4 text-left transition hover:bg-white/5 ${key==='unattached'?'border-amber-300/25 bg-amber-300/5':'border-white/10 bg-white/[0.03]'}`}><span className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">{label}<span className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor:colors[key]}}/></span><span style={{color:colors[key]}} className="mt-3 block font-mono text-lg">{formatBytes(details.data.groups[key].bytes)} <span className="text-xs text-on-surface-variant">· {details.data.groups[key].count} files</span></span><span className="mt-2 block text-xs leading-relaxed text-on-surface-variant">{descriptions[key]}</span></button>)}</div>
          {unused.length>0&&<div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4"><div><p className="text-sm text-amber-200">{unused.length} unused files to review</p><p className="mt-1 text-xs text-on-surface-variant">Up to {formatBytes(cleanBytes)} can be released.</p></div><button type="button" disabled={Boolean(busy)} onClick={removeAll} className="inline-flex items-center gap-2 rounded-xl border border-red-300/30 bg-red-300/5 px-4 py-2.5 text-sm text-red-200 disabled:opacity-40"><Icon name="trash"/>Delete all unused files</button></div>}
          {batchProgress!==null&&<div className="mb-4"><ProgressBar label="Cleaning unused files…" value={batchProgress}/></div>}
          {resultMessage&&<p role="status" className="mb-4 text-sm text-primary">{resultMessage}</p>}
          <p className="text-xs leading-relaxed text-on-surface-variant">Unattached uploads can remain after an interrupted or unpublished save. They still occupy storage and count toward your limit. Eligible unused uploads are cleaned by the server after 24 hours when cleanup runs. Deletions count until storage confirms removal.</p>
          <p className="mt-2 text-xs text-on-surface-variant">Local browser drafts and external download links do not count. MB uses 1,000,000 bytes.</p>
          <div className="mt-5 flex items-center justify-between"><h3 className="text-sm">{filter==='all'?'All files, largest first':labels[filter]}</h3>{filter!=='all'&&<button className="text-sm text-primary" onClick={()=>setFilter('all')}>Show all</button>}</div>
          {actionError&&<p role="alert" className="mt-3 text-sm text-red-300">{actionError}</p>}
          <ul className="mt-4 space-y-3">{details.data.items.filter(item=>filter==='all'||item.group===filter).map(item=><StorageFile key={item.id} item={item} busy={busy} remove={remove}/>)}</ul>
          {!details.data.items.some(item=>filter==='all'||item.group===filter)&&<p className="py-4 text-sm text-on-surface-variant">No files in this category.</p>}
        </>}
      </div>
    </dialog>
  </>;
}

function StorageFile({item,busy,remove}){
  const [size,setSize]=useState('');
  const [failed,setFailed]=useState(false);
  return <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm">{item.name}</p><p className="mt-1 text-xs text-on-surface-variant">{labels[item.group]} · {item.provider==='r2'?'R2':'Supabase'}</p><p className="mt-1 text-xs text-on-surface-variant">{item.bytes.toLocaleString()} bytes{size&&` · ${size}`}{item.createdAt&&` · ${new Date(item.createdAt).toLocaleString()}`}</p></div><span className="shrink-0 text-sm text-primary">{formatBytes(item.bytes)}</span></div>
    {item.previewUrl&&<details className="mt-3"><summary className="cursor-pointer text-sm text-primary">Preview image</summary>{failed?<p className="mt-3 text-sm text-on-surface-variant">Preview unavailable.</p>:<img src={item.previewUrl} alt={item.name} loading="lazy" onLoad={e=>setSize(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} px`)} onError={()=>setFailed(true)} className="mt-3 max-h-64 w-full rounded-xl bg-black/20 object-contain"/>}<a href={item.previewUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary">Open original ↗</a></details>}
    {['unattached','deleting'].includes(item.group)&&<button type="button" disabled={Boolean(busy)} onClick={()=>remove(item)} className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-300/30 px-3 py-2 text-xs text-red-300 disabled:opacity-50"><Icon name="trash"/>{busy===item.id?'Deleting…':item.group==='deleting'?'Retry deletion':'Delete unused file'}</button>}
  </li>;
}

export function StorageMeter({data}){
 const total=Math.max(1,data.quotaBytes,data.usedBytes);
 return <span className="vv-storage-meter" role="meter" aria-label="Storage allocation" aria-valuemin={0} aria-valuemax={data.quotaBytes} aria-valuenow={Math.min(data.usedBytes,data.quotaBytes)} aria-valuetext={`${formatBytes(data.usedBytes)} of ${formatBytes(data.quotaBytes)}`}><span className="vv-storage-meter-fill">{Object.entries(labels).map(([key,label])=><span key={key} title={`${label}: ${formatBytes(data.groups[key]?.bytes||0)}`} style={{background:colors[key],width:`${(data.groups[key]?.bytes||0)/total*100}%`}}/>)}</span></span>;
}
export function StorageOverview({data,error,onOpen}){
 return <button type="button" onClick={onOpen} className="vv-storage-card" aria-haspopup="dialog">
      <span className="vv-storage-card-top"><span className="vv-storage-card-icon"><Icon name="archive"/></span><span className="vv-storage-card-heading"><span><strong>Storage used or reserved</strong>{data&&<small>{(data.usedBytes/Math.max(1,data.quotaBytes)*100).toFixed(1)}% ALLOCATED</small>}</span><span>Review your images, private files and available space.</span></span><span className="vv-storage-card-total">{data?<><strong>{formatBytes(data.usedBytes)}</strong><span> / {formatBytes(data.quotaBytes)}</span></>:error||'Loading storage…'}</span><span className="vv-storage-details">Details <Icon name="info"/></span></span>
      {data&&<><StorageMeter data={data}/><span className="vv-storage-legend">{Object.entries(labels).filter(([key])=>data.groups[key]?.bytes>0).map(([key,label])=><span key={key}><i style={{background:colors[key]}}/>{key==='unattached'?'Unattached uploads':label}<strong>{formatBytes(data.groups[key].bytes)}</strong></span>)}{data.usedBytes===0&&<span>Your vault is ready for new creations.</span>}</span></>}
    </button>;
}
