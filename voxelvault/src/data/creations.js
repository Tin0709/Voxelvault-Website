import { creators } from "./creators";

const files = import.meta.glob("../assets/creations/*", {
  eager: true,
  query: "?url",
  import: "default",
});

const galleryFiles = import.meta.glob("../assets/creations/galleries/*/*", {
  eager: true,
  query: "?url",
  import: "default",
});

const imageExtension =
  /\.(jpe?g|jfif|pjpeg|pjp|png|apng|webp|avif|gif|svg|bmp|ico)$/i;

function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getGalleryImages(creationKey, title) {
  return Object.entries(galleryFiles)
    .filter(([path]) => {
      const segments = path.split("/");
      const folderName = segments[segments.length - 2];

      return folderName === creationKey && imageExtension.test(path);
    })
    .sort(([pathA], [pathB]) =>
      pathA.localeCompare(pathB, undefined, { numeric: true }),
    )
    .map(([path, src]) => {
      const filename = path.split("/").pop();

      const label = filename
        .replace(/\.[^.]+$/, "")
        .replace(/^\d+[-_\s]*/, "")
        .replace(/[-_]+/g, " ");

      return {
        src,
        alt: `${title} — ${label || "additional view"}`,
      };
    });
}

const details = {
  "the-queen-arc-raiders": {
    title: "The Queen — ARC Raiders",
    category: "fantasy",
  },
  "chamical-factory": {
    title: "Chemical Factory",
    category: "architecture",
  },
  "chemical-factory": {
    title: "Chemical Factory",
    category: "architecture",
  },
  "toothless-night-fury": {
    title: "Toothless — Night Fury",
    category: "fantasy",
  },
  "brookside-croft": {
    title: "Brookside Croft",
    category: "architecture",
    description: "A quiet countryside retreat, built one block at a time.",
    creatorId: "demo-creator",
  },
  leinhausen: {
    title: "Leinhausen",
    category: "architecture",
  },
  "artificial-sun": {
    title: "Artificial Sun",
    category: "fantasy",
  },
};

export const creations = Object.entries(files)
  .filter(([path]) => imageExtension.test(path))
  .map(([path, imageUrl]) => {
    const filename = path.split("/").pop();
    const nameWithoutExtension = filename.replace(/\.[^.]+$/, "");
    const key = normalizeName(nameWithoutExtension);
    const info = details[key] ?? {};
    const creator = creators.find((item) => item.id === info.creatorId);
    const title = info.title ?? nameWithoutExtension;

    const sourceDownloads =
      info.downloads ??
      (info.downloadUrl
        ? [
            {
              name: "World files",
              url: info.downloadUrl,
              format: info.fileFormat ?? "",
              size: info.fileSize ?? "",
            },
          ]
        : []);

    return {
      id: filename,
      title,
      category: info.category ?? "uncategorized",
      image: imageUrl,
      alt: info.alt ?? `Preview of ${title}`,

      gallery: [
        {
          src: imageUrl,
          alt: info.alt ?? `Preview of ${title}`,
        },
        ...getGalleryImages(key, title),
      ],

      creatorId: creator?.id ?? null,
      creator: creator?.name ?? info.creator ?? "Unknown creator",
      location: info.location ?? "Sample collection",
      description: info.description ?? "",
      revisionNotes: info.revisionNotes ?? "",
      minecraftVersion: info.minecraftVersion ?? "",

      downloads: sourceDownloads.map((download, index) => ({
        id: download.id ?? `${filename}-download-${index + 1}`,
        name: download.name ?? "",
        url: download.url ?? "",
        format: download.format ?? "",
        size: download.size ?? "",
      })),

      // Giữ để tương thích với component cũ.
      downloadUrl: info.downloadUrl ?? "",
      fileFormat: info.fileFormat ?? "",
      fileSize: info.fileSize ?? "",
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));
