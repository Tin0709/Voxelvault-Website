export default function LoadingState({ label = 'Opening your vault…' }) {
  return <div role="status" className="vault-loading flex min-h-64 flex-col items-center justify-center gap-4 py-16 text-center"><span className="vault-spinner" aria-hidden="true" /><p className="text-sm tracking-wide text-primary">{label}</p></div>;
}
