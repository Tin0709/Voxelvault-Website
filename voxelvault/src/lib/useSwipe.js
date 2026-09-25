import {useRef} from 'react';
export function useSwipe(onSwipe,{mouse=true}={}){
 const gesture=useRef(null);const suppressUntil=useRef(0);
 return {
 onPointerDown(e){if((!mouse&&e.pointerType==='mouse')||e.button!==0||e.target.closest('button'))return;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY};},
 onPointerMove(e){const g=gesture.current;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dy)>20&&Math.abs(dy)>Math.abs(dx)){gesture.current=null;return;}if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.3){e.currentTarget.setPointerCapture(e.pointerId);g.dragging=true;}},
 onPointerUp(e){const g=gesture.current;gesture.current=null;if(!g||g.id!==e.pointerId)return;if(g.dragging){suppressUntil.current=performance.now()+500;if(Math.abs(e.clientX-g.x)>45)onSwipe(e.clientX<g.x?1:-1);}if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);},
 onPointerCancel(){gesture.current=null;},
 onClickCapture(e){if(performance.now()<suppressUntil.current){e.preventDefault();e.stopPropagation();}},
 onDragStart(e){e.preventDefault();},
 };
}
