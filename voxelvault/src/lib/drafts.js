import {api,uploadFile} from './api';
import {notify} from './notifications';
function openDatabase() {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('voxelvault-drafts',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('drafts',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
}
async function transact(mode,run) {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts',mode);const request=run(tx.objectStore('drafts'));
    tx.oncomplete=()=>{db.close();resolve(request.result);};
    tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error||new Error('Draft could not be saved'));};
  });
}

const localGet=(owner,id)=>transact('readonly',store=>store.get(owner+':'+id));
const localPut=row=>transact('readwrite',store=>store.put(row));
export async function saveDraft(ownerId,id,payload){
 const previous=await localGet(ownerId,id);
 let row={id:ownerId+':'+id,draftId:id,ownerId,updatedAt:Date.now(),cloudVersion:previous?.cloudVersion,...payload,synced:false};
 await localPut(row);
 try{
  const prepared=await api('/me/drafts/'+id+'/prepare',{method:'POST',body:'{}'});
  const version=previous?.cloudVersion??0;
  if(prepared.version!==version)throw new Error('This draft changed on another device. Open it again before saving. Your edits remain on this browser.');
  async function media(items,kind){
   const result=[];
   for(const item of items){
    // Cache each successful upload locally so retrying a cloud save does not duplicate it.
    let next=item;
    const cached=(previous?.draft?.[kind==='image'?'gallery':'attachments']||[]).find(f=>f.localKey===(item.localKey||item.src||item.id)&&!f.file);
    if(item.file){const uploaded=cached||await uploadFile(item.file,kind,()=>{},{silent:true,draftId:id});next={...item,...uploaded,localKey:item.localKey||item.src||item.id};delete next.file;}
    result.push(next);
    row={...row,draft:{...row.draft,[kind==='image'?'gallery':'attachments']:[...result,...items.slice(result.length)]}};
    await localPut(row);
   }
   return result;
  }
  const gallery=await media(payload.draft.gallery,'image');const attachments=await media(payload.draft.attachments,'attachment');
  const clean={...payload,draft:{...payload.draft,gallery,attachments,image:gallery[0]?.src||''}};
  const response=await api('/me/drafts/'+id,{method:'POST',body:JSON.stringify({version,payload:clean})});
  await localPut(response.draft);return response.draft;
 }catch(error){return {...row,synced:false,syncError:error.message};}
}
export async function listDrafts(ownerId){
 const local=(await transact('readonly',store=>store.getAll())).filter(row=>row.ownerId===ownerId);
 try{
  const {drafts}=await api('/me/drafts');const merged=new Map(local.filter(row=>!row.synced).map(row=>[row.draftId,row]));
  for(const row of drafts){const cached=merged.get(row.draftId);if(!cached){merged.set(row.draftId,row);await localPut(row);}}
  return [...merged.values()].sort((a,b)=>b.updatedAt-a.updatedAt);
 }catch{notify('Cloud drafts are unavailable. Showing drafts saved on this browser.','info');return local.sort((a,b)=>b.updatedAt-a.updatedAt);}
}
export async function getDraft(ownerId,id){
 const local=await localGet(ownerId,id);
 try{const {draft}=await api('/me/drafts/'+id);if(!draft)return local||null;if(local&&!local.synced){if((local.cloudVersion??0)!==draft.cloudVersion)return {...local,conflict:draft};if(local.updatedAt>draft.updatedAt)return local;}await localPut(draft);return draft;}
 catch(error){if(error.status===404&&local?.synced){await transact('readwrite',store=>store.delete(ownerId+':'+id));return null;}if(local){notify('Using the draft saved on this browser. Cloud sync is unavailable.','info');return local;}throw error;}
}
export async function deleteDraft(ownerId,id){
 await api('/me/drafts/'+id,{method:'DELETE'});
 await transact('readwrite',store=>store.delete(ownerId+':'+id));
}

export async function resolveDraftConflict(local,useCloud){
 const cloud=local.conflict;
 const row=useCloud?cloud:{...local,cloudVersion:cloud.cloudVersion,conflict:undefined};
 await localPut(row);return row;
}
