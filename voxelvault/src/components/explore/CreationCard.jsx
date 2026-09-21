import { useState } from "react";

function CreationCard({ creation }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="group min-w-0">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {imageFailed ? (
          <div className="flex aspect-[4/3] items-center justify-center px-6 text-center text-sm text-on-surface-variant">
            Image unavailable
          </div>
        ) : (
          <img
            src={creation.image}
            alt={creation.alt}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="block h-auto w-full transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
          />
        )}

        <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs font-medium capitalize text-white backdrop-blur-md">
          {creation.category}
        </span>
      </div>

      <div className="px-1 pb-1 pt-4">
        <h2 className="break-words text-base font-semibold tracking-tight text-on-surface">
          {creation.title}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-variant">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary"
            >
              {creation.creator.slice(0, 1).toUpperCase()}
            </span>

            {creation.creator}
          </span>

          <span aria-hidden="true" className="text-white/25">
            ·
          </span>

          <span>{creation.location}</span>
        </div>
      </div>
    </article>
  );
}

export default CreationCard;
