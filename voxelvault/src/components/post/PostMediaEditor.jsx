import { useId, useState } from "react";

function PostMediaEditor({ images, onChange, onAddFiles }) {
  const inputId = useId();
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const activeImage = images[selectedIndex];

  function makeCover(index) {
    const nextImages = [
      images[index],
      ...images.filter((_, imageIndex) => imageIndex !== index),
    ];

    onChange(nextImages);
    setActiveIndex(0);
  }

  function removeImage(index) {
    onChange(images.filter((_, imageIndex) => imageIndex !== index));
    setActiveIndex(0);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline-lg text-xl">Public image gallery</h2>

          <p className="mt-2 text-sm text-on-surface-variant">
            Add images and choose a cover. Published images are public and can be saved by visitors.
          </p>
        </div>

        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
          {images.length} images
        </span>
      </div>

      {activeImage ? (
        <div className="relative overflow-hidden rounded-xl bg-black/25">
          <img
            src={activeImage.src}
            alt={activeImage.alt}
            className="aspect-[16/10] w-full object-contain"
          />

          <span className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs text-white">
            {selectedIndex === 0 ? "Cover image" : `Image ${selectedIndex + 1}`}
          </span>
        </div>
      ) : (
        <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-on-surface-variant">
          No images yet. Choose images below to get started.
        </div>
      )}

      <div className="mt-5">
        <label htmlFor={inputId} className="text-sm font-medium">
          Add images
        </label>

        <input
          id={inputId}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          onChange={(event) => {
            onAddFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
          className="mt-2 block w-full rounded-xl border border-dashed border-white/20 p-3 text-sm text-on-surface-variant file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-on-primary"
        />

        <p className="mt-2 text-xs text-on-surface-variant">
          JPG, PNG, WebP, AVIF or GIF. Local preview only.
        </p>
      </div>

      {images.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.src}
              className="overflow-hidden rounded-xl border border-white/10 bg-black/15"
            >
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Preview image ${index + 1}`}
                aria-pressed={selectedIndex === index}
                className={`block w-full p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  selectedIndex === index ? "bg-primary/40" : ""
                }`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="aspect-video w-full rounded-lg object-cover"
                />
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
                {index === 0 ? (
                  <span className="text-primary">Cover</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeCover(index)}
                    className="text-on-surface-variant hover:text-primary"
                  >
                    Set as cover
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label={`Remove image ${index + 1}`}
                  className="text-on-surface-variant hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default PostMediaEditor;
