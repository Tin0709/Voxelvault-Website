export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1000)), units.length - 1);
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(bytes / 1000 ** index)} ${units[index]}`;
}

export function describeFile(file) {
  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  const knownTypes = {
    zip: "ZIP archive", rar: "RAR archive", "7z": "7Z archive",
    pdf: "PDF document", txt: "Text document", docx: "Word document",
    obj: "3D model", glb: "3D model", gltf: "3D model", blend: "Blender file",
    litematic: "Litematic file", schematic: "Schematic file",
  };
  const mimeType = file.type || "application/octet-stream";
  const typeLabel = knownTypes[extension] ?? (
    mimeType.startsWith("image/") ? "Image" :
    mimeType.startsWith("video/") ? "Video" :
    mimeType.startsWith("audio/") ? "Audio" : "File"
  );
  return { originalName: file.name, sizeBytes: file.size, mimeType, extension, typeLabel };
}

export function safeCreditUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export const MAX_UPLOAD_BYTES = 50_000_000;

export function exceedsUploadLimit(file) {
  return file.size > MAX_UPLOAD_BYTES;
}

export const MAX_IMAGE_BYTES = MAX_UPLOAD_BYTES;
export function exceedsImageLimit(file) { return exceedsUploadLimit(file); }
