import { useState } from "react";
import { Link } from "react-router";
import PostGallery from "./PostGallery";

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

function PostEditor({ creation }) {
  const [draft, setDraft] = useState(() => ({
    ...creation,
    description: creation.description ?? "",
    downloadUrl: creation.downloadUrl ?? "",
    minecraftVersion: creation.minecraftVersion ?? "",
    fileFormat: creation.fileFormat ?? "",
    fileSize: creation.fileSize ?? "",
    revisionNotes: creation.revisionNotes ?? "",
  }));

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const detailUrl = `/creations/${encodeURIComponent(creation.id)}`;

  function updateField(event) {
    const { name, value } = event.target;

    setDraft((current) => ({
      ...current,
      [name]: value,
    }));

    // Ẩn bản xem trước cũ khi nội dung thay đổi.
    setPreview(null);
    setError("");
  }

  function handlePreview(event) {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError("Please enter a post title.");
      return;
    }

    const downloadUrl = draft.downloadUrl.trim();

    if (downloadUrl) {
      try {
        const url = new URL(downloadUrl);

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Unsupported URL");
        }
      } catch {
        setError("Please enter a valid HTTP or HTTPS download link.");
        return;
      }
    }

    setError("");
    setPreview({
      ...draft,
      title: draft.title.trim(),
      downloadUrl,
    });
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8 lg:px-10">
      <form onSubmit={handlePreview}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to={detailUrl}
              className="text-sm text-on-surface-variant hover:text-primary"
            >
              ← Back to post
            </Link>

            <h1 className="mt-3 font-headline-lg text-3xl">Edit post</h1>

            <p className="mt-2 text-sm text-on-surface-variant">
              Preview only. Changes are lost when you leave or refresh.
            </p>
          </div>

          <button
            type="submit"
            className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary transition hover:opacity-90"
          >
            Preview changes
          </button>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-6 lg:col-span-7">
            <section className={panelClass}>
              <h2 className="font-headline-lg text-xl">Media gallery</h2>

              <p className="mb-5 mt-2 text-sm text-on-surface-variant">
                Current cover and additional images.
              </p>

              <PostGallery creation={draft} />
            </section>

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
            <section className={`${panelClass} space-y-5`}>
              <div>
                <h2 className="font-headline-lg text-xl">Downloadable file</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Add a link to the world save or other downloadable file.
                </p>
              </div>

              <label className="block text-sm">
                Download URL
                <input
                  name="downloadUrl"
                  type="url"
                  value={draft.downloadUrl}
                  onChange={updateField}
                  placeholder="https://..."
                  className={inputClass}
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  File format
                  <input
                    name="fileFormat"
                    value={draft.fileFormat}
                    onChange={updateField}
                    placeholder="e.g. ZIP, LITEMATIC"
                    className={inputClass}
                  />
                </label>

                <label className="block text-sm">
                  File size
                  <input
                    name="fileSize"
                    value={draft.fileSize}
                    onChange={updateField}
                    placeholder="e.g. 2.4 GB"
                    className={inputClass}
                  />
                </label>
              </div>
            </section>

            <section className={`${panelClass} space-y-5`}>
              <h2 className="font-headline-lg text-xl">
                Additional information
              </h2>

              <label className="block text-sm">
                Collection
                <input
                  name="location"
                  value={draft.location ?? ""}
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
              ["File format", preview.fileFormat],
              ["File size", preview.fileSize],
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

          {preview.downloadUrl && (
            <a
              href={preview.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block rounded-full bg-primary px-5 py-3 text-sm font-medium text-on-primary"
            >
              Open download link ↗
            </a>
          )}
        </section>
      )}
    </main>
  );
}

export default PostEditor;
