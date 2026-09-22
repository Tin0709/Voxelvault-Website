import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, uploadFile } from "../../lib/api";
import PostGallery from "./PostGallery";
import PostMediaEditor from "./PostMediaEditor";
import PostAttachmentsEditor from "./PostAttachmentsEditor";
import PostCredits from "./PostCredits";
import ExternalDownloadsEditor from "./ExternalDownloadsEditor";
import { exceedsUploadLimit, formatBytes, safeCreditUrl } from "../../utils/attachments";

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
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const savedUploads = useRef(new Map());
  const postId = useRef(mode === 'create' ? crypto.randomUUID() : creation.id);
  const [draft, setDraft] = useState(() => ({
    ...creation,
    title: creation.title ?? "",
    category: creation.category ?? "uncategorized",
    location: creation.location ?? "",
    description: creation.description ?? "",
    minecraftVersion: creation.minecraftVersion ?? "",
    revisionNotes: creation.revisionNotes ?? "",

    ownerId: creation.ownerId ?? null,
    originalCreator: creation.originalCreator ?? "",
    originalSource: creation.originalSource ?? "",
    creditUrl: creation.creditUrl ?? "",
    externalDownloads: (creation.externalDownloads ?? []).map((link) => ({ ...link })),
    attachments: (creation.attachments ?? []).map((attachment) => ({ ...attachment })),

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
    // A misplaced file drop must not navigate away and destroy the draft.
    function preventFileNavigation(event) {
      if (Array.from(event.dataTransfer?.types ?? []).includes("Files")) {
        event.preventDefault();
        if (event.type === "dragover") event.dataTransfer.dropEffect = "none";
      }
    }
    window.addEventListener("dragover", preventFileNavigation);
    window.addEventListener("drop", preventFileNavigation);
    return () => {
      window.removeEventListener("dragover", preventFileNavigation);
      window.removeEventListener("drop", preventFileNavigation);
    };
  }, []);

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
    setSaveError('');
  }

  async function savePost() {
    if (!preview || saving) return;
    setSaving(true); setSaveError('');
    async function ensureUploaded(item, kind) {
      if (!item.file) return { id: item.id, alt: item.alt ?? '' };
      const key = item.src || item.id;
      if (savedUploads.current.has(key)) return savedUploads.current.get(key);
      const update = (progress, status) => setUploadProgress((current) => ({ ...current, [key]: { name: item.file.name, progress, status } }));
      update(0,'uploading');
      try {
        const result = await uploadFile(item.file, kind, (percent) => update(percent, percent === 100 ? 'verifying' : 'uploading'));
        const record = { id: result.id, alt: item.alt ?? '' };
        savedUploads.current.set(key, record);
        update(100,'complete'); return record;
      } catch (error) { update(0,'failed'); throw error; }
    }
    try {
      const images = [];
      const attachments = [];
      for (const image of preview.gallery) images.push(await ensureUploaded(image,'image'));
      for (const file of preview.attachments) attachments.push(await ensureUploaded(file,'attachment'));
      await api(`/posts/${postId.current}`, { method: 'POST', body: JSON.stringify({
        title: preview.title, description: preview.description, category: preview.category, location: preview.location,
        minecraftVersion: preview.minecraftVersion, revisionNotes: preview.revisionNotes,
        originalCreator: preview.originalCreator, originalSource: preview.originalSource, creditUrl: preview.creditUrl,
        version: creation.version ?? 0, images, attachments, externalDownloads: preview.externalDownloads,
      }) });
      navigate(`/creations/${postId.current}`);
    } catch (error) { setSaveError(error.message); } finally { setSaving(false); }
  }

  function updateField(event) {
    const { name, value } = event.target;

    setDraft((current) => ({
      ...current,
      [name]: value,
    }));

    clearPreview();
  }

  function addAttachments(attachments) {
    setDraft((current) => ({
      ...current,
      attachments: [...current.attachments, ...attachments],
    }));
    clearPreview();
  }

  function removeAttachment(id) {
    setDraft((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== id),
    }));
    clearPreview();
  }

  function updateExternalDownloads(externalDownloads) {
    setDraft((current) => ({ ...current, externalDownloads }));
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

      if (exceedsUploadLimit(file)) {
        rejectedNames.push(`${file.name} (over 50 MB)`);
        continue;
      }

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

    const creditUrl = draft.creditUrl.trim();
    if (creditUrl && !safeCreditUrl(creditUrl)) {
      setError("Credit URL needs a valid HTTP or HTTPS link.");
      return;
    }

    const externalDownloads = draft.externalDownloads.map((link) => ({
      ...link, name: link.name.trim(), url: link.url.trim(),
    }));
    for (const [index, link] of externalDownloads.entries()) {
      if (!link.name || !safeCreditUrl(link.url)) {
        setError(`External link ${index + 1} needs a name and a valid HTTP or HTTPS URL.`);
        return;
      }
    }

    setError("");

    setPreview({
      ...draft,
      title: draft.title.trim(),
      originalCreator: draft.originalCreator.trim(),
      originalSource: draft.originalSource.trim(),
      creditUrl,
      externalDownloads,
    });
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8 lg:px-10">
      <form onSubmit={handlePreview}>
        <fieldset disabled={saving} className="min-w-0">
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
                ? "Showcase your images, add source credit, and select private attachments."
                : "Update your public showcase, source credit, and private attachments."}
            </p>

            <p className="mt-2 text-xs text-on-surface-variant">
              Preview your changes, then publish to save. Unsaved changes are lost when you leave or refresh.
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
            <PostAttachmentsEditor
              attachments={draft.attachments}
              onAdd={addAttachments}
              onRemove={removeAttachment}
            />
            <ExternalDownloadsEditor links={draft.externalDownloads} onChange={updateExternalDownloads} />

            <section className={`${panelClass} space-y-5`}>
              <h2 className="font-headline-lg text-xl">Source & credit</h2>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Optional public credit for the original work. The original creator may be
                different from the account posting it. Credit does not grant access to attachments.
              </p>
              {[
                ["originalCreator", "Original creator", "Name of the original author"],
                ["originalSource", "Original source", "Website, project or collection"],
                ["creditUrl", "Original post / Credit URL", "https://..."],
              ].map(([name, label, placeholder]) => (
                <label key={name} className="block text-sm">
                  {label}
                  <input name={name} type={name === "creditUrl" ? "url" : "text"}
                    value={draft[name]} onChange={updateField} placeholder={placeholder}
                    maxLength={name === "creditUrl" ? 2048 : 200} className={inputClass} />
                </label>
              ))}
            </section>

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
        </fieldset>
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
            <PostCredits {...preview} />
          </div>
          <div className="mt-6 rounded-xl border border-white/10 p-5">
            <h3 className="font-headline-lg text-xl">Private attachments · Owner preview</h3>
            <p className="mt-3 text-sm text-on-surface-variant">
              {preview.attachments.length} files selected · {formatBytes(preview.attachments.reduce((total, file) => total + file.sizeBytes, 0))}.
              {" "}New files upload when you save. This list is not part of the public showcase.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {preview.attachments.map((file) => <li key={file.id} className="break-words">{file.originalName} · {formatBytes(file.sizeBytes)}</li>)}
            </ul>
            <h3 className="mt-6 font-headline-lg text-xl">External downloads · Owner preview</h3>
            <p className="mt-2 text-sm text-on-surface-variant">Links only; files remain on the external service. Changes are saved when you publish.</p>
            {preview.externalDownloads.length === 0 && <p className="mt-3 text-sm text-on-surface-variant">No external links added.</p>}
            <ul className="mt-3 space-y-3 text-sm">
              {preview.externalDownloads.map((link) => (
                <li key={link.id} className="break-words">
                  <a href={safeCreditUrl(link.url)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{link.name} ↗</a>
                  <p className="mt-1 break-all text-xs text-on-surface-variant">{link.url}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6">
            <ul className="space-y-3" aria-live="polite">
              {Object.entries(uploadProgress).map(([key, item]) => <li key={key} className="break-words text-sm">
                <p>{item.name} — {({uploading:'Uploading',verifying:'Verifying storage',complete:'Uploaded',failed:'Failed; retry or remove the file'})[item.status]}</p>
                <progress max="100" value={item.progress} aria-label={`Upload ${item.name}`} className="mt-2 w-full accent-primary" />
              </li>)}
            </ul>
            {saveError && <p role="alert" className="mt-4 text-red-300">{saveError}</p>}
            <button type="button" disabled={saving} onClick={savePost} className="mt-5 rounded-full bg-primary px-6 py-3 text-sm text-on-primary disabled:opacity-50">
              {saving ? 'Uploading and saving…' : saveError ? 'Retry save' : isCreating ? 'Publish post' : 'Save changes'}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default PostEditor;
