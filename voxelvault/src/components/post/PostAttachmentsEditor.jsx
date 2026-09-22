import { useState } from "react";
import FileDropZone from "../ui/FileDropZone";
import { describeFile, exceedsUploadLimit, formatBytes } from "../../utils/attachments";

function PostAttachmentsEditor({ attachments, onAdd, onRemove }) {
  const [rejectedNames, setRejectedNames] = useState([]);
  const totalBytes = attachments.reduce((total, file) => total + file.sizeBytes, 0);

  function selectFiles(selectedFiles) {
    setRejectedNames(selectedFiles.filter(exceedsUploadLimit).map((file) => file.name));
    const files = selectedFiles.filter((file) => !exceedsUploadLimit(file)).map((file) => ({
      ...describeFile(file),
      id: crypto.randomUUID(),
      file,
      status: "selected",
    }));
    if (files.length) onAdd(files);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-headline-lg text-xl">Private attachments</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">Owner only</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
        Attach files up to 50 MB each. For larger files, add an external download link below.
        Only the account that owns this post can download uploaded files.
      </p>
      <FileDropZone
        label="Choose files — optional"
        prompt="Drag and drop private files here"
        hint="50 MB per file (50,000,000 bytes). Files upload when you save the post. Up to 5 MB uses Supabase; larger attachments use R2."
        onFiles={selectFiles}
      />
      {rejectedNames.length > 0 && (
        <p role="alert" className="mt-3 break-words text-sm text-red-300">
          Over 50 MB: {rejectedNames.join(", ")}. Add an external download link for these files instead.
        </p>
      )}
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
                <span className="text-xs text-primary">{attachment.status === 'ready' ? 'Stored privately' : 'Selected locally · Upload on save'}</span>
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
