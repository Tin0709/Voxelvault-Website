import { useEffect, useRef } from "react";

function CreationModal({ creation, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;

    dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="creation-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-background p-0 text-on-surface shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <div className="relative">
        <button
          type="button"
          autoFocus
          onClick={onClose}
          aria-label="Close image details"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>

        <div className="flex min-h-48 items-center justify-center bg-black/30">
          <img
            src={creation.image}
            alt={creation.alt}
            className="block max-h-[60dvh] w-full object-contain"
          />
        </div>

        <div className="p-6 sm:p-8">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            {creation.category}
          </span>

          <h2
            id="creation-modal-title"
            className="mt-3 font-headline-lg text-2xl tracking-tight sm:text-3xl"
          >
            {creation.title}
          </h2>

          <p className="mt-3 text-sm text-on-surface-variant">
            {creation.creator} · {creation.location}
          </p>

          {creation.description && (
            <p className="mt-5 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
              {creation.description}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
            <a
              href={creation.image}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium transition hover:bg-white/5"
            >
              Open original image ↗
            </a>

            {creation.downloadUrl ? (
              <a
                href={creation.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition hover:opacity-90"
              >
                Get world files ↗
              </a>
            ) : (
              <span className="text-xs text-on-surface-variant">
                World download not available yet
              </span>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}

export default CreationModal;
