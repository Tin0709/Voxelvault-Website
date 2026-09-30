import {notify} from '../../lib/notifications';
import {MAX_POST_IMAGES} from '../../utils/attachments';
import { confirmAction } from '../../lib/confirm';
import Icon from '../ui/Icon';
import { useState } from "react";
import FileDropZone from "../ui/FileDropZone";

function PostMediaEditor({ images, onChange, onAddFiles }) {
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

  async function removeImage(index) {
    if(!await confirmAction('Remove this image from the draft? Save to apply the change.'))return;
    onChange(images.filter((_, imageIndex) => imageIndex !== index));
    setActiveIndex(0);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline-lg text-xl"><Icon name="image" className="mr-2 text-primary"/>Public image gallery</h2>

          <p className="mt-2 text-sm text-on-surface-variant">
            Add images and choose a cover. Published images are public and can be saved by visitors.
          </p>
        </div>
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

      <FileDropZone
        disabled={images.length>=MAX_POST_IMAGES}
        onDisabledAttempt={()=>notify("You've reached the 50-image limit.",'info')}
        label="Add images"
        prompt="Drag and drop images here"
        hint="JPG, PNG, WebP, AVIF or GIF. Up to 50 MB per image (50,000,000 bytes). Drop multiple images or choose files. Local preview only."
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        onFiles={onAddFiles}
      />

      {images.length > 0 && (
        <div className="vault-filmstrip mt-5">
          {images.map((image, index) => (
            <div
              key={image.src}
              className="w-40 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/15"
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
      <div className="vv-image-limit mt-3" data-level={images.length>=MAX_POST_IMAGES?'full':images.length>=MAX_POST_IMAGES-5?'near':'normal'}>
        <p role="status">{images.length} / {MAX_POST_IMAGES} images{images.length>=MAX_POST_IMAGES&&<span>Maximum {MAX_POST_IMAGES} images reached.</span>}</p>
        <div role="progressbar" aria-label="Post image limit" aria-valuemin={0} aria-valuemax={MAX_POST_IMAGES} aria-valuenow={Math.min(images.length,MAX_POST_IMAGES)}><span style={{width:Math.min(100,images.length/MAX_POST_IMAGES*100)+'%'}}/></div>
      </div>
    </section>
  );
}

export default PostMediaEditor;
