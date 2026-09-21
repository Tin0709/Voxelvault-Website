// Vite lấy URL của các file trong thư mục creations.
// eager chỉ import URL ngay; ảnh vẫn được tải theo thẻ <img>.
const files = import.meta.glob("../assets/creations/*", {
  eager: true,
  query: "?url",
  import: "default",
});

// Chấp nhận cả đuôi viết thường và viết hoa, ví dụ .jpg và .JPG.
const imageExtension =
  /\.(jpe?g|jfif|pjpeg|pjp|png|apng|webp|avif|gif|svg|bmp|ico)$/i;

// Chuẩn hóa tên để khớp thông tin:
// "Toothless – Night Fury" → "toothless-night-fury"
function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Thông tin mẫu: bạn có thể chỉnh category, creator, location.
// Các category khớp với FilterBar hiện tại.
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

    const title = info.title ?? nameWithoutExtension;

    return {
      // Giữ phần mở rộng để hai file cùng tên khác định dạng
      // vẫn có ID riêng.
      id: filename,
      title,
      category: info.category ?? "uncategorized",
      image: imageUrl,
      alt: info.alt ?? `Preview of ${title}`,
      creator: info.creator ?? "Unknown creator",
      location: info.location ?? "Sample collection",
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));
