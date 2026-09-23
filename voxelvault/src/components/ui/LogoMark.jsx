import {useId} from 'react';
export default function LogoMark({active=false,onAnimationEnd}) {
const uid=useId();
return (<svg aria-hidden="true" focusable="false" width="52" height="52" viewBox="60 46 160 160" className={`voxelvault-single-loop-logo ${active ? "vv-brand-active" : ""}`} onAnimationEnd={onAnimationEnd}>
<defs>


<linearGradient id={`${uid}-vvSingleTopGrad`} x1="0%" x2="100%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#ecfdf5"></stop>
<stop offset="35%" stopColor="#a7f3d0"></stop>
<stop offset="100%" stopColor="#6ee7b7"></stop>
</linearGradient>

<linearGradient id={`${uid}-vvSingleLeftGrad`} x1="0%" x2="100%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#10b981"></stop>
<stop offset="100%" stopColor="#047857"></stop>
</linearGradient>

<linearGradient id={`${uid}-vvSingleRightGrad`} x1="0%" x2="100%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#059669"></stop>
<stop offset="100%" stopColor="#064e3b"></stop>
</linearGradient>

<radialGradient cx="50%" cy="50%" id={`${uid}-vvSingleFloorGlow`} r="50%">
<stop offset="0%" stopColor="#10b981" stopOpacity="0.5"></stop>
<stop offset="55%" stopColor="#059669" stopOpacity="0.18"></stop>
<stop offset="100%" stopColor="#000000" stopOpacity="0"></stop>
</radialGradient>

<radialGradient cx="50%" cy="50%" id={`${uid}-vvSingleContactShadow`} r="50%">
<stop offset="0%" stopColor="#022c22" stopOpacity="0.9"></stop>
<stop offset="60%" stopColor="#022c22" stopOpacity="0.3"></stop>
<stop offset="100%" stopColor="#022c22" stopOpacity="0"></stop>
</radialGradient>

<radialGradient cx="50%" cy="50%" id={`${uid}-vvSingleShockwaveGrad`} r="50%">
<stop offset="70%" stopColor="#34d399" stopOpacity="0"></stop>
<stop offset="88%" stopColor="#6ee7b7" stopOpacity="0.45"></stop>
<stop offset="100%" stopColor="#10b981" stopOpacity="0"></stop>
</radialGradient>

<filter height="160%" id={`${uid}-vvSingleNeonGlow`} width="160%" x="-30%" y="-30%">
<feGaussianBlur result="blur" stdDeviation="3.2"></feGaussianBlur>
<feMerge>
<feMergeNode in="blur"></feMergeNode>
<feMergeNode in="SourceGraphic"></feMergeNode>
</feMerge>
</filter>
</defs>



<g className="single-shadow-rig">
<ellipse cx="140" cy="186" fill={`url(#${uid}-vvSingleFloorGlow)`} rx="56" ry="17"></ellipse>
<ellipse cx="140" cy="184" fill={`url(#${uid}-vvSingleContactShadow)`} rx="40" ry="12"></ellipse>
<ellipse cx="140" cy="185" fill="#011913" opacity="0.8" rx="24" ry="7"></ellipse>
</g>

<g className="single-shockwave-rig">
<ellipse cx="140" cy="186" fill={`url(#${uid}-vvSingleShockwaveGrad)`} rx="52" ry="15"></ellipse>
</g>

<g className="energy-sparkle-1" transformOrigin="84px 74px">
<path d="M 84 65 Q 84 74 75 74 Q 84 74 84 83 Q 84 74 93 74 Q 84 74 84 65 Z" fill="#6ee7b7"></path>
<circle cx="76" cy="67" fill="#ffffff" r="1.6"></circle>
</g>
<g className="energy-sparkle-2" transformOrigin="196px 78px">
<path d="M 196 71 Q 196 78 189 78 Q 196 78 196 85 Q 196 78 203 78 Q 196 78 196 71 Z" fill="#34d399"></path>
<circle cx="204" cy="73" fill="#d1fae5" r="1.8"></circle>
</g>

<g className="single-cube-master">
<g className="single-cube-geom" filter={`url(#${uid}-vvSingleNeonGlow)`}>

<g transform="translate(140, 134)">


<polygon fill={`url(#${uid}-vvSingleTopGrad)`} points="0,-42 42,-18 0,7 -42,-18"></polygon>

<line opacity="0.92" stroke="#ffffff" strokeLinecap="round" strokeWidth="2.4" x1="0" x2="41" y1="-41" y2="-18"></line>
<line opacity="0.75" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.8" x1="-41" x2="0" y1="-18" y2="-41"></line>
<circle cx="0" cy="-42" fill="#ffffff" r="2.8"></circle>

<polygon fill={`url(#${uid}-vvSingleLeftGrad)`} points="-42,-18 0,7 0,52 -42,27"></polygon>

<polygon fill="#34d399" opacity="0.2" points="-39,-15 -3,7 -3,47 -39,24"></polygon>

<polygon fill={`url(#${uid}-vvSingleRightGrad)`} points="0,7 42,-18 42,27 0,52"></polygon>

<polygon fill="#022c22" opacity="0.28" points="3,8 39,-14 39,24 3,47"></polygon>

<line opacity="0.85" stroke="#a7f3d0" strokeLinecap="round" strokeWidth="2.2" x1="0" x2="0" y1="7" y2="52"></line>

<polygon fill="none" opacity="0.65" points="0,-42 42,-18 42,27 0,52 -42,27 -42,-18" stroke="#6ee7b7" strokeLinejoin="round" strokeWidth="1.6"></polygon>

<circle cx="0" cy="7" fill="#ffffff" opacity="0.95" r="2.6"></circle>

<g className="energy-core-pulse">

<polygon fill="#ffffff" opacity="0.45" points="0,-30 24,-13 0,4 -24,-13"></polygon>
<line opacity="0.6" stroke="#ffffff" strokeWidth="1.2" x1="0" x2="0" y1="-30" y2="4"></line>

<polygon fill="none" opacity="0.75" points="0,-42 42,-18 42,27 0,52 -42,27 -42,-18" stroke="#ffffff" strokeWidth="1.8"></polygon>
</g>
</g>
</g>
</g>
</svg>);
}
