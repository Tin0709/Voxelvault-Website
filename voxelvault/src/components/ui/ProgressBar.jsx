export default function ProgressBar({label,value}) {
  const percent=Number.isFinite(value)?Math.round(Math.min(100,Math.max(0,value))):null;
  return <div className="w-full min-w-0" role="status">
    <div className={`mb-3 flex items-center gap-4 font-mono text-xs sm:text-sm ${percent===null?'justify-center text-center':'justify-between'}`}><span className="truncate text-on-surface-variant" title={label}>{label}</span>{percent!==null&&<span className="shrink-0 font-semibold text-primary">{percent}%</span>}</div>
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent??undefined} className="h-2 overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full bg-primary transition-[width] duration-300 ease-out ${percent===null?'vv-progress-indeterminate':''}`} style={{width:percent===null?'35%':`${percent}%`}}/>
    </div>
  </div>;
}
