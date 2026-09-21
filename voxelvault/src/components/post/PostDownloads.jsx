function getSafeUrl(value) {
  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function PostDownloads({ downloads = [] }) {
  if (downloads.length === 0) {
    return (
      <p className="rounded-xl bg-white/5 p-4 text-center text-sm text-on-surface-variant">
        Downloads are not available for this creation yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {downloads.map((download) => {
        const url = getSafeUrl(download.url);

        return (
          <li
            key={download.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <p className="break-words font-medium">{download.name}</p>

            {(download.format || download.size) && (
              <p className="mt-1 text-xs text-on-surface-variant">
                {[download.format, download.size].filter(Boolean).join(" · ")}
              </p>
            )}

            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:opacity-90"
              >
                Open download ↗
              </a>
            ) : (
              <p className="mt-3 text-xs text-red-300">
                Download link unavailable.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default PostDownloads;
