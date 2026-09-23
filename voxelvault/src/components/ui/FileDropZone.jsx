import { useId, useRef, useState } from "react";
import Icon from './Icon';

function FileDropZone({ label, prompt, hint, accept, onFiles, multiple = true, disabled = false }) {
  const inputId = useId();
  const inputRef = useRef(null);
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
          if (disabled || !hasFiles(event)) return;
          event.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        }}
        onDragEnd={resetDrag}
        onDrop={handleDrop}
        className={`group flex flex-col items-center rounded-2xl border border-dashed px-5 py-8 text-center transition duration-200 sm:px-8 focus-within:border-primary/70 ${
          disabled ? "border-white/10 bg-white/[0.02] opacity-50" : dragging ? "border-primary bg-primary/10 ring-4 ring-primary/5" : "border-primary/25 bg-gradient-to-b from-primary/[0.04] to-transparent hover:border-primary/50 hover:from-primary/[0.07]"
        }`}
      >
        <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition-transform duration-200 ${dragging && !disabled ? '-translate-y-1 scale-110' : ''}`}>
          <Icon name="upload"/>
        </span>
        <p aria-live="polite" className="text-sm font-medium text-on-surface sm:text-base">
          {dragging ? "Drop here to add" : prompt}
        </p>
        <p className="mt-1.5 text-xs text-on-surface-variant">or browse files on your device</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          aria-controls={inputId}
          aria-describedby={`${inputId}-hint`}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition hover:brightness-110 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background disabled:cursor-not-allowed"
        >
          <Icon name={accept?.startsWith('image/') ? 'image' : 'plus'} className="!h-4 !w-4"/>
          {label}
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          aria-label={label}
          tabIndex={-1}
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
          className="hidden"
        />
        <p id={`${inputId}-hint`} className="mt-4 max-w-sm text-xs leading-relaxed text-on-surface-variant">{hint}</p>
      </div>
      <p id={`${inputId}-error`} role="alert" className={error ? "mt-2 text-center text-sm text-red-300" : "sr-only"}>{error}</p>
    </div>
  );
}

export default FileDropZone;
