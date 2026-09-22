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
export async function saveDraft(ownerId,id,payload) {
  await transact('readwrite',store=>store.put({id:`${ownerId}:${id}`,draftId:id,ownerId,updatedAt:Date.now(),...payload}));
}
export async function listDrafts(ownerId) {return (await transact('readonly',store=>store.getAll())).filter(row=>row.ownerId===ownerId).sort((a,b)=>b.updatedAt-a.updatedAt);}
export async function getDraft(ownerId,id) {return transact('readonly',store=>store.get(`${ownerId}:${id}`));}
export async function deleteDraft(ownerId,id) {return transact('readwrite',store=>store.delete(`${ownerId}:${id}`));}
