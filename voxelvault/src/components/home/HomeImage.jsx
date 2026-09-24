import {useState} from 'react';
import VaultLoader from '../ui/VaultLoader';
import Icon from '../ui/Icon';
export default function HomeImage({src,alt='',priority=false}){
 const [status,setStatus]=useState('loading');
 return <div className="vv-home-media" aria-busy={status==='loading'}>
  {status!=='ready'&&<div className="vv-home-media-status" role="status">{status==='loading'?<><VaultLoader/><span>Opening the archive…</span></>:<><Icon name="image"/><span>Image unavailable</span></>}</div>}
  {src&&status!=='error'&&<img src={src} alt={alt} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} onLoad={()=>setStatus('ready')} onError={()=>setStatus('error')} style={{opacity:status==='ready'?1:0}}/>}
 </div>;
}
