export default function RequestState({ loading, error }) {
  return <main className="mx-auto w-full max-w-6xl flex-1 p-10" role={error ? 'alert' : 'status'}>
    {loading ? 'Loading…' : error}
    {error && <button className="ml-4 text-primary hover:underline" onClick={() => window.location.reload()}>Retry</button>}
  </main>;
}
