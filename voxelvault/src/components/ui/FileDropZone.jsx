import { useId, useRef, useState } from "react";

function FileDropZone({ label, prompt, hint, accept, onFiles, multiple = true, disabled = false }) {
  const inputId = useId();
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function hasFiles(event) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function resetDrag() {
    depth.current = 0;
    setDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    resetDrag();
    if (disabled) return;
    if (!hasFiles(event)) return;

    // Read entries synchronously while the drop's data store is accessible.
    const items = Array.from(event.dataTransfer.items ?? []).filter((item) => item.kind === "file");
    let hasDirectory = false;
    const files = items.length ? items.flatMap((item) => {
      if (item.webkitGetAsEntry?.()?.isDirectory) {
        hasDirectory = true;
        return [];
      }
      const file = item.getAsFile();
      return file ? [file] : [];
    }) : Array.from(event.dataTransfer.files ?? []);

    setError(hasDirectory
      ? "Folders are not supported. Choose individual files or a ZIP archive."
      : files.length === 0 ? "No readable files found. Please use the file picker." : "");
    if (files.length) onFiles(files);
  }

  return (
    <div className="mt-5">
      <div
        onDragEnter={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        }}
        onDragEnd={resetDrag}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-5 transition-colors focus-within:border-primary ${
          dragging ? "border-primary bg-primary/15" : "border-white/20 bg-black/10"
        }`}
      >
        <p aria-live="polite" className="text-sm font-medium text-primary">
          {dragging ? "Drop here to add" : prompt}
        </p>
        <label htmlFor={inputId} className="mt-3 block text-sm text-on-surface-variant">{label}</label>
        <input
          id={inputId}
          type="file"
          multiple={multiple}
          disabled={disabled}
          accept={accept}
          aria-describedby={`${inputId}-hint ${inputId}-error`}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            setError("");
            if (files.length) onFiles(files);
          }}
          className="mt-3 block w-full min-w-0 text-sm text-on-surface-variant file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-on-primary"
        />
      </div>
      <p id={`${inputId}-hint`} className="mt-2 text-xs leading-relaxed text-on-surface-variant">{hint}</p>
      <p id={`${inputId}-error`} role="alert" className="mt-2 text-sm text-red-300">{error}</p>
    </div>
  );
}

export default FileDropZone;
