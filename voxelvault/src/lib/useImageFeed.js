import {useEffect,useRef,useState} from 'react';
import {api} from './api';
export function useImageFeed(category,search) {
  const [seed]=useState(()=>crypto.randomUUID());
  const [state,setState]=useState({items:[],next:null,loading:true,error:''});
  const loadingMore=useRef(false);
  const alive=useRef(false);
  const params=new URLSearchParams({seed,category:category==='all'?'':category,search});
  const path=`/feed?${params}`;
  useEffect(()=>{alive.current=true;const controller=new AbortController();
    api(path,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setState({...result,loading:false,error:''});}).catch(error=>{if(!controller.signal.aborted)setState({items:[],next:null,loading:false,error:error.message});});
    return()=>{alive.current=false;controller.abort();};
  },[path]);
  async function loadMore(){
    if(!state.next||loadingMore.current)return;
    loadingMore.current=true;setState(current=>({...current,loadingMore:true,error:''}));
    try{const result=await api(`${path}&after=${encodeURIComponent(state.next)}`);if(alive.current)setState(current=>({...result,items:[...current.items,...result.items.filter(item=>!current.items.some(existing=>existing.id===item.id))],loading:false,loadingMore:false,error:''}));}
    catch(error){if(alive.current)setState(current=>({...current,loadingMore:false,error:error.message}));}
    finally{loadingMore.current=false;}
  }
  return {...state,loadMore};
}
