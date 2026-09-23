// Work only on the reviewed snapshot; never include uploads created during cleanup.
export async function cleanUnusedUploads(items, removeFile, onProgress = () => {}) {
  const candidates=[...new Map(items.filter(item=>['unattached','deleting'].includes(item.group)).map(item=>[item.id,item])).values()];
  const result={deleted:0,bytes:0,failures:[]};
  for(const [index,item] of candidates.entries()){
    try{await removeFile(item.id);result.deleted++;result.bytes+=item.bytes;}
    catch(error){result.failures.push({id:item.id,name:item.name,message:error.message});}
    onProgress(index+1,candidates.length);
  }
  return result;
}
