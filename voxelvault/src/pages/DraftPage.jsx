import {useEffect,useState} from 'react';
import {useParams} from 'react-router';
import {useAuth} from '../auth/AuthContext';
import {getDraft} from '../lib/drafts';
import PostEditor from '../components/post/PostEditor';
import RequestState from '../components/ui/RequestState';
export default function DraftPage(){
  const {id}=useParams();const {user}=useAuth();const [result,setResult]=useState(null);
  useEffect(()=>{let active=true;const urls=[];
    getDraft(user.id,id).then(row=>{
      if(!active)return;
      if(!row){setResult({error:'This draft is not available in this browser.'});return;}
      row.draft.gallery=row.draft.gallery.map(image=>{if(!image.file)return image;const src=URL.createObjectURL(image.file);urls.push(src);return {...image,src};});
      setResult({row});
    }).catch(error=>{if(active)setResult({error:error.message});});
    return()=>{active=false;urls.forEach(url=>URL.revokeObjectURL(url));};
  },[id,user.id]);
  if(!result||result.error)return <RequestState loading={!result} error={result?.error}/>;
  const {row}=result;
  return <PostEditor creation={row.creation} mode={row.mode} initialDraft={row.draft} draftId={row.draftId} restoredPostId={row.postId}/>;
}
