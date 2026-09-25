import {createId} from './createId';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
export function useImageFeed(category,search,view='images') {
  const [seed]=useState(()=>createId());
  const [state,setState]=useState({items:[],next:null,loading:true,error:''});
  const [attempt,setAttempt]=useState(0);
  const loadingMore=useRef(false);
  const alive=useRef(false);
  const params=new URLSearchParams({seed,view,category:category==='all'?'':category,search});
  const path=`/feed?${params}`;
  useEffect(()=>{alive.current=true;const controller=new AbortController();
    api(path,{signal:controller.signal}).then(result=>{if(view==='posts'&&result.items.some(item=>!Array.isArray(item.gallery)))throw new Error('Post view needs the updated backend. Please switch to image view for now.');if(!controller.signal.aborted)setState({...result,loading:false,error:''});}).catch(error=>{if(!controller.signal.aborted)setState({items:[],next:null,loading:false,error:error.message});});
    return()=>{alive.current=false;controller.abort();};
  },[path,view,attempt]);
  function retry(){
    if(state.next)return loadMore();
    setState({items:[],next:null,loading:true,error:''});
    setAttempt(current=>current+1);
  }
  async function loadMore(){
    if(!state.next||loadingMore.current)return;
    loadingMore.current=true;setState(current=>({...current,loadingMore:true,error:''}));
    try{const result=await api(`${path}&after=${encodeURIComponent(state.next)}`);if(alive.current)setState(current=>({...result,items:[...current.items,...result.items.filter(item=>!current.items.some(existing=>existing.id===item.id))],loading:false,loadingMore:false,error:''}));}
    catch(error){if(alive.current)setState(current=>({...current,loadingMore:false,error:error.message}));}
    finally{loadingMore.current=false;}
  }
  return {...state,loadMore,retry};
}
