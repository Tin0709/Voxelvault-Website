import { safeCreditUrl } from "../../utils/attachments";

function PostCredits({ originalCreator, originalSource, creditUrl }) {
  const url = safeCreditUrl(creditUrl);
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="font-headline-lg text-xl">Source & credit</h2>
      {!originalCreator && !originalSource && !creditUrl ? (
        <p className="mt-3 text-sm text-on-surface-variant">No source or credit added.</p>
      ) : (
        <dl className="mt-4 space-y-4 text-sm">
          {[["Original creator", originalCreator], ["Original source", originalSource]].filter(([, value]) => value).map(([label, value]) => (
            <div key={label}><dt className="text-on-surface-variant">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>
          ))}
          {creditUrl && <div><dt className="text-on-surface-variant">Credit URL</dt><dd className="mt-1 break-all">
            {url ? <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{url} ↗</a> : "Source link unavailable."}
          </dd></div>}
        </dl>
      )}
    </section>
  );
}

export default PostCredits;
