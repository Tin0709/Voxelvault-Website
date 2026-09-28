import {api} from './api';

// Never infer upload validity from a filename, signed URL or earlier success.
export async function invalidCachedUploads(images, attachments, context) {
  const imageIds=[...new Set(images.map(item=>item.id))];
  const attachmentIds=[...new Set(attachments.map(item=>item.id))];
  if(!imageIds.length&&!attachmentIds.length)return new Set();
  const result=await api('/uploads/validate',{method:'POST',body:JSON.stringify({
    ...context,images:imageIds,attachments:attachmentIds,
  })});
  return new Set([...result.invalidImages,...result.invalidAttachments]);
}
