import {useId,useMemo,useRef,useEffect} from 'react';
import brand from '../../assets/navigation/brand.svg?raw';
import search from '../../assets/navigation/search.svg?raw';
import signout from '../../assets/navigation/signout.svg?raw';
import explore from '../../assets/navigation/explore.svg?raw';
import signup from '../../assets/navigation/signup.svg?raw';
import profile from '../../assets/navigation/profile.svg?raw';
import create from '../../assets/navigation/create.svg?raw';
const artwork={brand,search,signout,explore,signup,profile,create};
// Local, reviewed SVG artwork only. Scripts and remote imports were removed.
export default function AnimatedArtwork({name,active=false}){
 const host=useRef(null);
 useEffect(()=>{const svg=host.current?.querySelector('svg');for(const state of ['is-hovered','is-open','is-animating'])svg?.classList.toggle(state,active);},[active]);
 const uid=useId().replace(/[^a-z0-9]/gi,'');
 const html=useMemo(()=>{
 let svg=artwork[name];
 const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 for(const id of ids){svg=svg.replaceAll(`id="${id}"`,`id="${uid}-${id}"`).replaceAll(`#${id}`,`#${uid}-${id}`);}
 return svg.replace('<svg class="','<svg aria-hidden="true" focusable="false" class="');
 },[name,uid]);
 return <span ref={host} aria-hidden="true" className={`vv-art vv-art-${name} ${active?'vv-playing':''}`} dangerouslySetInnerHTML={{__html:html}}/>;
}
