import {useEffect,useState} from 'react';
import {useParams} from 'react-router';
import {useAuth} from '../auth/AuthContext';
import {getDraft,resolveDraftConflict} from '../lib/drafts';
import PostEditor from '../components/post/PostEditor';
import RequestState from '../components/ui/RequestState';
export default function DraftPage(){
  const {id}=useParams();const {user}=useAuth();const [result,setResult]=useState(null);
  useEffect(()=>{let active=true;const urls=[];
    getDraft(user.id,id).then(row=>{
      if(!active)return;
      if(!row){setResult({error:'This draft is no longer available.'});return;}
      row.draft.gallery=row.draft.gallery.map(image=>{if(!image.file)return image;const src=URL.createObjectURL(image.file);urls.push(src);return {...image,src};});
      setResult({row});
    }).catch(error=>{if(active)setResult({error:error.message});});
    return()=>{active=false;urls.forEach(url=>URL.revokeObjectURL(url));};
  },[id,user.id]);
  if(!result||result.error)return <RequestState loading={!result} error={result?.error}/>;
  const {row}=result;
  if(row.conflict)return <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16"><h1 className="text-2xl">This draft changed on another device</h1><p className="mt-4 text-on-surface-variant">Your browser has unsynced edits. Open the cloud version to replace this browser copy, or keep your browser edits and replace the cloud version the next time you save.</p><div className="mt-6 flex flex-wrap gap-3"><button className="rounded-full bg-primary px-5 py-3 text-on-primary" onClick={async()=>{try{setResult({row:await resolveDraftConflict(row,true)});}catch(error){setResult({error:error.message});}}}>Open cloud version</button><button className="rounded-full border border-white/20 px-5 py-3" onClick={async()=>{try{setResult({row:await resolveDraftConflict(row,false)});}catch(error){setResult({error:error.message});}}}>Keep browser edits</button></div></main>;
  return <PostEditor creation={row.creation} mode={row.mode} initialDraft={row.draft} draftId={row.draftId} restoredPostId={row.postId}/>;
}
