import {useId} from 'react';
export default function VaultLoader({compact=false}) {
const uid=useId();
return (<svg aria-hidden="true" focusable="false" width={compact ? 48 : 272} height={compact ? 26 : 144} viewBox="0 0 340 180" className={`voxel-three-cubes-loader ${compact ? "vv-loader-compact" : ""}`}>
<defs>


<linearGradient id={`${uid}-cubeTop3`} x1="0%" x2="100%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#ecfdf5"></stop>
<stop offset="35%" stopColor="#a7f3d0"></stop>
<stop offset="100%" stopColor="#6ee7b7"></stop>
</linearGradient>

<linearGradient id={`${uid}-cubeLeft3`} x1="0%" x2="100%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#10b981"></stop>
<stop offset="100%" stopColor="#047857"></stop>
</linearGradient>

<linearGradient id={`${uid}-cubeRight3`} x1="0%" x2="100%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#059669"></stop>
<stop offset="100%" stopColor="#064e3b"></stop>
</linearGradient>

<radialGradient cx="50%" cy="50%" id={`${uid}-shadowGlow3`} r="50%">
<stop offset="0%" stopColor="#10b981" stopOpacity="0.45"></stop>
<stop offset="55%" stopColor="#059669" stopOpacity="0.15"></stop>
<stop offset="100%" stopColor="#000000" stopOpacity="0"></stop>
</radialGradient>

<radialGradient cx="50%" cy="50%" id={`${uid}-contactShadow3`} r="50%">
<stop offset="0%" stopColor="#022c22" stopOpacity="0.85"></stop>
<stop offset="60%" stopColor="#022c22" stopOpacity="0.25"></stop>
<stop offset="100%" stopColor="#022c22" stopOpacity="0"></stop>
</radialGradient>

<filter height="160%" id={`${uid}-neonCubeGlow`} width="160%" x="-30%" y="-30%">
<feGaussianBlur result="blur" stdDeviation="2.5"></feGaussianBlur>
<feMerge>
<feMergeNode in="blur"></feMergeNode>
<feMergeNode in="SourceGraphic"></feMergeNode>
</feMerge>
</filter>
</defs>



<g className="shadow-unit-1">
<ellipse cx="75" cy="132" fill={`url(#${uid}-shadowGlow3)`} rx="34" ry="11"></ellipse>
<ellipse cx="75" cy="131" fill={`url(#${uid}-contactShadow3)`} rx="24" ry="7.5"></ellipse>
<ellipse cx="75" cy="131.5" fill="#011913" opacity="0.8" rx="14" ry="4.5"></ellipse>
</g>

<g className="shadow-unit-2">
<ellipse cx="170" cy="132" fill={`url(#${uid}-shadowGlow3)`} rx="34" ry="11"></ellipse>
<ellipse cx="170" cy="131" fill={`url(#${uid}-contactShadow3)`} rx="24" ry="7.5"></ellipse>
<ellipse cx="170" cy="131.5" fill="#011913" opacity="0.8" rx="14" ry="4.5"></ellipse>
</g>

<g className="shadow-unit-3">
<ellipse cx="265" cy="132" fill={`url(#${uid}-shadowGlow3)`} rx="34" ry="11"></ellipse>
<ellipse cx="265" cy="131" fill={`url(#${uid}-contactShadow3)`} rx="24" ry="7.5"></ellipse>
<ellipse cx="265" cy="131.5" fill="#011913" opacity="0.8" rx="14" ry="4.5"></ellipse>
</g>


<g className="cube-unit-1" filter={`url(#${uid}-neonCubeGlow)`}>
<g transform="translate(75, 96)">

<polygon fill={`url(#${uid}-cubeTop3)`} points="0,-26 26,-11 0,4 -26,-11"></polygon>
<line opacity="0.85" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.8" x1="0" x2="25" y1="-25" y2="-11"></line>
<line opacity="0.7" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.4" x1="-25" x2="0" y1="-11" y2="-25"></line>
<circle cx="0" cy="-26" fill="#ffffff" r="2"></circle>

<polygon fill={`url(#${uid}-cubeLeft3)`} points="-26,-11 0,4 0,32 -26,17"></polygon>
<polygon fill="#34d399" opacity="0.18" points="-24,-9 -2,4 -2,29 -24,15"></polygon>

<polygon fill={`url(#${uid}-cubeRight3)`} points="0,4 26,-11 26,17 0,32"></polygon>
<polygon fill="#022c22" opacity="0.25" points="2,5 24,-8 24,15 2,29"></polygon>

<line opacity="0.8" stroke="#a7f3d0" strokeLinecap="round" strokeWidth="1.5" x1="0" x2="0" y1="4" y2="32"></line>
<polygon fill="none" opacity="0.55" points="0,-26 26,-11 26,17 0,32 -26,17 -26,-11" stroke="#6ee7b7" strokeWidth="1.2"></polygon>
<circle cx="0" cy="4" fill="#ffffff" opacity="0.95" r="1.8"></circle>
</g>
</g>

<g className="cube-unit-2" filter={`url(#${uid}-neonCubeGlow)`}>
<g transform="translate(170, 96)">

<polygon fill={`url(#${uid}-cubeTop3)`} points="0,-26 26,-11 0,4 -26,-11"></polygon>
<line opacity="0.85" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.8" x1="0" x2="25" y1="-25" y2="-11"></line>
<line opacity="0.7" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.4" x1="-25" x2="0" y1="-11" y2="-25"></line>
<circle cx="0" cy="-26" fill="#ffffff" r="2"></circle>

<polygon fill={`url(#${uid}-cubeLeft3)`} points="-26,-11 0,4 0,32 -26,17"></polygon>
<polygon fill="#34d399" opacity="0.18" points="-24,-9 -2,4 -2,29 -24,15"></polygon>

<polygon fill={`url(#${uid}-cubeRight3)`} points="0,4 26,-11 26,17 0,32"></polygon>
<polygon fill="#022c22" opacity="0.25" points="2,5 24,-8 24,15 2,29"></polygon>

<line opacity="0.8" stroke="#a7f3d0" strokeLinecap="round" strokeWidth="1.5" x1="0" x2="0" y1="4" y2="32"></line>
<polygon fill="none" opacity="0.55" points="0,-26 26,-11 26,17 0,32 -26,17 -26,-11" stroke="#6ee7b7" strokeWidth="1.2"></polygon>
<circle cx="0" cy="4" fill="#ffffff" opacity="0.95" r="1.8"></circle>
</g>
</g>

<g className="cube-unit-3" filter={`url(#${uid}-neonCubeGlow)`}>
<g transform="translate(265, 96)">

<polygon fill={`url(#${uid}-cubeTop3)`} points="0,-26 26,-11 0,4 -26,-11"></polygon>
<line opacity="0.85" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.8" x1="0" x2="25" y1="-25" y2="-11"></line>
<line opacity="0.7" stroke="#ffffff" strokeLinecap="round" strokeWidth="1.4" x1="-25" x2="0" y1="-11" y2="-25"></line>
<circle cx="0" cy="-26" fill="#ffffff" r="2"></circle>

<polygon fill={`url(#${uid}-cubeLeft3)`} points="-26,-11 0,4 0,32 -26,17"></polygon>
<polygon fill="#34d399" opacity="0.18" points="-24,-9 -2,4 -2,29 -24,15"></polygon>

<polygon fill={`url(#${uid}-cubeRight3)`} points="0,4 26,-11 26,17 0,32"></polygon>
<polygon fill="#022c22" opacity="0.25" points="2,5 24,-8 24,15 2,29"></polygon>

<line opacity="0.8" stroke="#a7f3d0" strokeLinecap="round" strokeWidth="1.5" x1="0" x2="0" y1="4" y2="32"></line>
<polygon fill="none" opacity="0.55" points="0,-26 26,-11 26,17 0,32 -26,17 -26,-11" stroke="#6ee7b7" strokeWidth="1.2"></polygon>
<circle cx="0" cy="4" fill="#ffffff" opacity="0.95" r="1.8"></circle>
</g>
</g>
</svg>);
}
