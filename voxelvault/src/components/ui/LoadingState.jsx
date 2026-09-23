import VaultLoader from './VaultLoader';
import ProgressBar from './ProgressBar';

export default function LoadingState({ label = 'Opening your vault…', compact = false }) {
  return <div className={`vault-loading flex items-center justify-center text-center ${compact ? 'gap-2' : 'min-h-64 flex-col gap-3 py-10'}`}><VaultLoader compact={compact}/>{compact?<span role="status" className="text-sm text-primary">{label}</span>:<div className="w-full max-w-sm px-4"><ProgressBar label={label}/></div>}</div>;
}
