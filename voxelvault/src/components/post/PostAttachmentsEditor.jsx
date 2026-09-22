import { useId } from "react";
import { describeFile, formatBytes } from "../../utils/attachments";

function PostAttachmentsEditor({ attachments, onAdd, onRemove }) {
  const inputId = useId();
  const totalBytes = attachments.reduce((total, file) => total + file.sizeBytes, 0);

  function selectFiles(event) {
    const files = Array.from(event.target.files ?? []).map((file) => ({
      ...describeFile(file),
      id: crypto.randomUUID(),
      file,
      status: "selected",
    }));
    onAdd(files);
    event.target.value = "";
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-headline-lg text-xl">Private attachments</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">Owner only</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
        Attach your saves, models, documents or other files. Once storage is connected,
        only the account that owns this post will be able to download them.
      </p>
      <label htmlFor={inputId} className="mt-5 block text-sm font-medium">Choose files — optional</label>
      <input id={inputId} type="file" multiple onChange={selectFiles}
        aria-describedby={`${inputId}-hint`}
        className="mt-2 block w-full min-w-0 rounded-xl border border-dashed border-white/20 p-3 text-sm text-on-surface-variant file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-on-primary" />
      <p id={`${inputId}-hint`} className="mt-2 text-xs leading-relaxed text-on-surface-variant">
        Local selection only. Nothing is uploaded or stored. Upload progress and retry will be available when storage is connected.
      </p>
      <p role="status" className="mt-5 text-sm text-primary">
        {attachments.length} files selected · {formatBytes(totalBytes)}
      </p>
      {attachments.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-on-surface-variant">
          No attachments selected. You can create a post with images only.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="min-w-0 rounded-xl border border-white/10 p-4">
              <p className="break-words text-sm font-medium">{attachment.originalName}</p>
              <p className="mt-2 break-words text-xs text-on-surface-variant">
                {attachment.typeLabel} · {formatBytes(attachment.sizeBytes)}
              </p>
              <p className="mt-1 break-all text-xs text-on-surface-variant">
                {attachment.mimeType} · {attachment.sizeBytes.toLocaleString("en")} bytes
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-primary">Selected locally · Not uploaded</span>
                <button type="button" onClick={() => onRemove(attachment.id)}
                  aria-label={`Remove ${attachment.originalName}`}
                  className="rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-400/10">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default PostAttachmentsEditor;
