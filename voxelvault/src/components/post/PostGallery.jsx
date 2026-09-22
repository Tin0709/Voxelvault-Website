import { useRef, useState } from "react";

function PostGallery({ creation }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const strip = useRef(null);
  const originalImages = creation.gallery?.length
    ? creation.gallery
    : [{ src: creation.image, alt: creation.alt }];

  const picked=originalImages.find(image=>image.id===creation.selectedImageId);
  const images=picked?[picked,...originalImages.filter(image=>image!==picked)]:originalImages;
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <section aria-label="Creation gallery" className="min-w-0">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/25">
        <img
          src={activeImage.src}
          alt={activeImage.alt}
          className="aspect-[16/10] w-full object-contain"
        />

        <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs capitalize text-primary backdrop-blur-md">
          {creation.category}
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
          <span className="text-xs text-white">
            View {activeIndex + 1} / {images.length}
          </span>

          <a
            href={activeImage.src}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-black/60 px-3 py-2 text-xs text-white transition hover:bg-black/90"
          >
            Open original ↗
          </a>
        </div>
      </div>

      {images.length > 1 && (
        <div className="rounded-b-2xl border border-t-0 border-white/10 bg-black/20 p-2"><div className="flex items-center justify-between px-2 pt-2 text-xs text-on-surface-variant"><span>{images.length} photos · Scroll to explore</span><span><button type="button" aria-label="Scroll thumbnails left" onClick={()=>strip.current?.scrollBy({left:-280,behavior:'smooth'})} className="px-3 py-2">←</button><button type="button" aria-label="Scroll thumbnails right" onClick={()=>strip.current?.scrollBy({left:280,behavior:'smooth'})} className="px-3 py-2">→</button></span></div><div ref={strip} className="vault-filmstrip">
          {images.map((image, index) => (
            <button
              key={`${image.src}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === activeIndex}
              className={`w-28 shrink-0 overflow-hidden rounded-xl sm:w-36 border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                index === activeIndex
                  ? "border-primary opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={image.src}
                alt=""
                loading="lazy"
                className="aspect-video w-full object-cover"
              />
            </button>
          ))}
        </div></div>
      )}
    </section>
  );
}

export default PostGallery;
