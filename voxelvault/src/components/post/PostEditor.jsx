import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import PostGallery from "./PostGallery";
import PostMediaEditor from "./PostMediaEditor";
import PostDownloadsEditor from "./PostDownloadsEditor";
import PostDownloads from "./PostDownloads";

const categories = [
  "architecture",
  "landscapes",
  "survival",
  "fantasy",
  "redstone",
  "uncategorized",
];

const panelClass = "rounded-2xl border border-white/10 bg-white/[0.03] p-6";

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

function PostEditor({ creation, mode = "edit" }) {
  const [draft, setDraft] = useState(() => ({
    ...creation,
    title: creation.title ?? "",
    category: creation.category ?? "uncategorized",
    location: creation.location ?? "",
    description: creation.description ?? "",
    minecraftVersion: creation.minecraftVersion ?? "",
    revisionNotes: creation.revisionNotes ?? "",

    downloads: (creation.downloads ?? []).map((download, index) => ({
      id: download.id ?? `${creation.id}-download-${index + 1}`,
      name: download.name ?? "",
      url: download.url ?? "",
      format: download.format ?? "",
      size: download.size ?? "",
    })),

    gallery: creation.gallery?.length
      ? creation.gallery.map((image) => ({ ...image }))
      : creation.image
        ? [
            {
              src: creation.image,
              alt: creation.alt ?? creation.title,
            },
          ]
        : [],
  }));

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [mediaError, setMediaError] = useState("");

  const isMounted = useRef(false);
  const objectUrls = useRef(new Set());

  const isCreating = mode === "create";

  const backUrl = isCreating
    ? "/"
    : `/creations/${encodeURIComponent(creation.id)}`;
  useEffect(() => {
    isMounted.current = true;
    const urls = objectUrls.current;

    return () => {
      isMounted.current = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function clearPreview() {
    setPreview(null);
    setError("");
  }

  function updateField(event) {
    const { name, value } = event.target;

    setDraft((current) => ({
      ...current,
      [name]: value,
    }));

    clearPreview();
  }

  function updateDownloads(downloads) {
    setDraft((current) => ({
      ...current,
      downloads,
    }));

    clearPreview();
  }

  function updateGallery(images) {
    const retainedUrls = new Set(images.map((image) => image.src));

    // Chỉ thu hồi ảnh đã nằm trong gallery và vừa bị xóa.
    // Không thu hồi URL của những ảnh đang được đọc.
    for (const image of draft.gallery) {
      if (!retainedUrls.has(image.src) && objectUrls.current.has(image.src)) {
        URL.revokeObjectURL(image.src);
        objectUrls.current.delete(image.src);
      }
    }

    setDraft((current) => ({
      ...current,
      gallery: images,
      image: images[0]?.src ?? "",
      alt: images[0]?.alt ?? "",
    }));

    clearPreview();
  }

  async function addImages(files) {
    const allowedExtension = /\.(jpe?g|png|webp|avif|gif)$/i;
    const acceptedImages = [];
    const rejectedNames = [];

    for (const file of files) {
      if (!isMounted.current) return;

      if (!allowedExtension.test(file.name)) {
        rejectedNames.push(file.name);
        continue;
      }

      const src = URL.createObjectURL(file);
      objectUrls.current.add(src);

      const readable = await new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = src;
      });

      if (!isMounted.current) return;

      if (!objectUrls.current.has(src)) {
        continue;
      }

      if (!readable) {
        URL.revokeObjectURL(src);
        objectUrls.current.delete(src);
        rejectedNames.push(file.name);
        continue;
      }

      acceptedImages.push({
        src,
        alt: file.name.replace(/\.[^.]+$/, ""),
        file,
      });
    }

    if (!isMounted.current) return;

    const availableImages = acceptedImages.filter((image) =>
      objectUrls.current.has(image.src),
    );

    if (availableImages.length > 0) {
      setDraft((current) => {
        const gallery = [...current.gallery, ...availableImages];

        return {
          ...current,
          gallery,
          image: gallery[0].src,
          alt: gallery[0].alt,
        };
      });

      clearPreview();
    }

    setMediaError(
      rejectedNames.length > 0
        ? `Could not read: ${rejectedNames.join(", ")}`
        : "",
    );
  }

  function handlePreview(event) {
    event.preventDefault();

    if (draft.gallery.length === 0) {
      setError("Please add at least one image.");
      return;
    }

    if (!draft.title.trim()) {
      setError("Please enter a post title.");
      return;
    }

    const downloads = [];

    for (const [index, download] of draft.downloads.entries()) {
      const name = download.name.trim();
      const url = download.url.trim();

      if (!name || !url) {
        setError(`Please enter a name and URL for file ${index + 1}.`);
        return;
      }

      try {
        const parsedUrl = new URL(url);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Unsupported protocol");
        }
      } catch {
        setError(`File ${index + 1} needs a valid HTTP or HTTPS link.`);
        return;
      }

      downloads.push({
        ...download,
        name,
        url,
        format: (download.format ?? "").trim(),
        size: (download.size ?? "").trim(),
      });
    }

    setError("");

    setPreview({
      ...draft,
      title: draft.title.trim(),
      downloads,
    });
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8 lg:px-10">
      <form onSubmit={handlePreview}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to={backUrl}
              className="text-sm text-on-surface-variant hover:text-primary"
            >
              {isCreating ? "← Back to Explore" : "← Back to post"}
            </Link>

            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-primary">
              VoxelVault Studio
            </p>

            <h1 className="mt-3 font-headline-lg text-3xl">
              {isCreating ? "Create a new post" : "Edit post"}
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-on-surface-variant">
              {isCreating
                ? "Share your images, tell their story, and add downloadable files."
                : "Update your images, post details, and downloadable files."}
            </p>

            <p className="mt-2 text-xs text-on-surface-variant">
              Preview only. Changes are lost when you leave or refresh.
            </p>
          </div>

          <button
            type="submit"
            className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary transition hover:opacity-90"
          >
            {isCreating ? "Preview post" : "Preview changes"}
          </button>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-6 lg:col-span-7">
            <PostMediaEditor
              images={draft.gallery}
              onChange={updateGallery}
              onAddFiles={addImages}
            />

            {mediaError && (
              <p role="alert" className="text-sm text-red-300">
                {mediaError}
              </p>
            )}

            <section className={`${panelClass} space-y-5`}>
              <h2 className="font-headline-lg text-xl">Post details</h2>

              <label className="block text-sm">
                Title
                <input
                  name="title"
                  value={draft.title}
                  onChange={updateField}
                  required
                  maxLength={120}
                  className={inputClass}
                />
              </label>

              <label className="block text-sm">
                Description
                <textarea
                  name="description"
                  value={draft.description}
                  onChange={updateField}
                  rows={7}
                  placeholder="Tell the story behind this creation..."
                  className={`${inputClass} resize-y`}
                />
              </label>

              <label className="block text-sm">
                Category
                <select
                  name="category"
                  value={draft.category}
                  onChange={updateField}
                  className={`${inputClass} capitalize`}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <details className={panelClass}>
              <summary className="cursor-pointer font-headline-lg text-xl">
                Changelog & revision notes
              </summary>

              <label className="mt-4 block text-sm">
                What changed?
                <textarea
                  name="revisionNotes"
                  value={draft.revisionNotes}
                  onChange={updateField}
                  rows={4}
                  placeholder="Describe updates to this creation..."
                  className={`${inputClass} resize-y`}
                />
              </label>
            </details>
          </div>

          <div className="min-w-0 space-y-6 lg:col-span-5">
            <PostDownloadsEditor
              downloads={draft.downloads}
              onChange={updateDownloads}
            />

            <section className={`${panelClass} space-y-5`}>
              <h2 className="font-headline-lg text-xl">
                Additional information
              </h2>

              <label className="block text-sm">
                Collection
                <input
                  name="location"
                  value={draft.location}
                  onChange={updateField}
                  className={inputClass}
                />
              </label>

              <label className="block text-sm">
                Minecraft version — optional
                <input
                  name="minecraftVersion"
                  value={draft.minecraftVersion}
                  onChange={updateField}
                  placeholder="e.g. Java 1.21"
                  className={inputClass}
                />
              </label>
            </section>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-6 text-sm text-red-300">
            {error}
          </p>
        )}
      </form>

      {preview && (
        <section
          aria-labelledby="editor-preview-title"
          className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8"
        >
          <p role="status" className="text-sm text-primary">
            Preview updated — nothing has been saved.
          </p>

          <div className="mt-5">
            <PostGallery
              key={preview.gallery.map((image) => image.src).join("|")}
              creation={preview}
            />
          </div>

          <h2
            id="editor-preview-title"
            className="mt-4 break-words font-headline-lg text-3xl"
          >
            {preview.title}
          </h2>

          <p className="mt-2 text-sm capitalize text-primary">
            {preview.category}
          </p>

          <p className="mt-5 whitespace-pre-line break-words text-on-surface-variant">
            {preview.description || "No description added."}
          </p>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            {[
              ["Collection", preview.location],
              ["Minecraft version", preview.minecraftVersion],
              ["Revision notes", preview.revisionNotes],
            ]
              .filter(([, value]) => value?.trim())
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-on-surface-variant">{label}</dt>
                  <dd className="mt-1 whitespace-pre-line break-words">
                    {value}
                  </dd>
                </div>
              ))}
          </dl>

          <div className="mt-6">
            <h3 className="mb-4 font-headline-lg text-xl">Downloads</h3>

            <PostDownloads downloads={preview.downloads} />
          </div>
        </section>
      )}
    </main>
  );
}

export default PostEditor;
