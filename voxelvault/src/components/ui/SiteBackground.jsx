import {useEffect,useState} from 'react';
const staticBackground='(hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)';
export default function SiteBackground(){
 const [disabled,setDisabled]=useState(()=>window.matchMedia(staticBackground).matches);
 useEffect(()=>{
  const media=window.matchMedia(staticBackground),update=()=>setDisabled(media.matches);
  update();media.addEventListener('change',update);
  return()=>media.removeEventListener('change',update);
 },[]);
 return <div className={'vv-site-background'+(disabled?' vv-site-background-static':'')} aria-hidden="true">{!disabled&&<><i/><i/><i/><span/><span/><span/></>}</div>;
}
