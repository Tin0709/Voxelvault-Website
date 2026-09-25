export function storageReport(files, profile, quotaBytes) {
  const groups = Object.fromEntries(['postImages','attachments','profileImages','drafts','unattached','pending','deleting'].map(key=>[key,{bytes:0,count:0}]));
  const items=files.map(file=>{
    const group=file.status==='deleting'?'deleting':file.status==='pending'?'pending':
      [profile?.avatar_upload_id,profile?.cover_upload_id].includes(file.id)?'profileImages':
      file.draft_id&&!file.post_id?'drafts':!file.post_id?'unattached':file.kind==='image'?'postImages':'attachments';
    const bytes=Number(file.size_bytes);
    groups[group].bytes+=bytes;groups[group].count++;
    return {id:file.id,name:file.original_name,bytes,group,kind:file.kind,provider:file.provider,createdAt:file.created_at};
  }).sort((a,b)=>b.bytes-a.bytes);
  return {quotaBytes:Number(quotaBytes),usedBytes:items.reduce((sum,item)=>sum+item.bytes,0),groups,items};
}
