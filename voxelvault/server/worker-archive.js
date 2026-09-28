// Streaming ZIP STORE records: UTF-8 names, CRC32 data descriptors and a small
// central directory. No file bodies are retained between entries.
export function safeFilename(value, fallback = 'file') {
  // Keep the Node archive's filename contract without importing its Node APIs.
  // eslint-disable-next-line no-control-regex
  const result = String(value ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, '-')
    .replace(/^\.+|[. ]+$/g, '').trim().slice(0, 140);
  return result || fallback;
}

function archiveNames(files) {
  const used = new Set();
  return files.map(file => {
    const base = safeFilename(file.original_name), dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base, ext = dot > 0 ? base.slice(dot) : '';
    let name = base, n = 2;
    while (used.has(name.toLowerCase())) name = `${stem} (${n++})${ext}`;
    used.add(name.toLowerCase());
    return new TextEncoder().encode(name);
  });
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function record(length, signature) {
  const bytes = new Uint8Array(length), view = new DataView(bytes.buffer);
  view.setUint32(0, signature, true);
  return { bytes, view };
}

export function streamArchive(files, openFile, onFinish = () => {}) {
  const names = archiveNames(files);
  // Existing per-account/per-file quotas fit ZIP32. Reject overflow rather than
  // emitting a corrupt archive if those limits change in the future.
  const total = files.reduce((sum, file, i) => sum + Number(file.size_bytes) + 92 + 2 * names[i].length, 22);
  if (files.length >= 65535 || !Number.isSafeInteger(total) || total >= 0xffffffff ||
      files.some(file => !Number.isSafeInteger(Number(file.size_bytes)) || Number(file.size_bytes) < 0)) {
    throw Object.assign(new Error('Archive is too large'), { status: 413 });
  }
  let activeReader, finished = false;
  const finish = () => { if (!finished) { finished = true; onFinish(); } };
  const now = new Date(), year = Math.max(1980, Math.min(2107, now.getFullYear()));
  const date = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  async function* generate() {
    const directory = [];
    let offset = 0;
    try {
      for (const [i, file] of files.entries()) {
        const name = names[i], start = offset;
        const header = record(30 + name.length, 0x04034b50);
        header.view.setUint16(4, 20, true);
        header.view.setUint16(6, 0x808, true); // UTF-8 + trailing data descriptor
        header.view.setUint16(10, time, true);
        header.view.setUint16(12, date, true);
        header.view.setUint16(26, name.length, true);
        header.bytes.set(name, 30);
        yield header.bytes;
        offset += header.bytes.length;
        let crc = 0xffffffff, size = 0;
        const source = await openFile(file);
        activeReader = source.getReader();
        try {
          for (;;) {
            const { value, done } = await activeReader.read();
            if (done) break;
            size += value.byteLength;
            if (size > Number(file.size_bytes)) throw new Error('Archive file size mismatch');
            for (const byte of value) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
            yield value;
            offset += value.byteLength;
          }
        } finally {
          await activeReader.cancel().catch(() => {});
          activeReader.releaseLock();
          activeReader = null;
        }
        if (size !== Number(file.size_bytes)) throw new Error('Archive file size mismatch');
        crc = (crc ^ 0xffffffff) >>> 0;
        const descriptor = record(16, 0x08074b50);
        descriptor.view.setUint32(4, crc, true);
        descriptor.view.setUint32(8, size, true);
        descriptor.view.setUint32(12, size, true);
        yield descriptor.bytes;
        offset += 16;
        const central = record(46 + name.length, 0x02014b50);
        central.view.setUint16(4, 20, true);
        central.view.setUint16(6, 20, true);
        central.view.setUint16(8, 0x808, true);
        central.view.setUint16(12, time, true);
        central.view.setUint16(14, date, true);
        central.view.setUint32(16, crc, true);
        central.view.setUint32(20, size, true);
        central.view.setUint32(24, size, true);
        central.view.setUint16(28, name.length, true);
        central.view.setUint32(42, start, true);
        central.bytes.set(name, 46);
        directory.push(central.bytes);
      }
      const directoryStart = offset;
      for (const entry of directory) { yield entry; offset += entry.length; }
      const end = record(22, 0x06054b50);
      end.view.setUint16(8, files.length, true);
      end.view.setUint16(10, files.length, true);
      end.view.setUint32(12, offset - directoryStart, true);
      end.view.setUint32(16, directoryStart, true);
      yield end.bytes;
    } finally { finish(); }
  }
  const iterator = generate();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) controller.close(); else controller.enqueue(value);
      } catch {
        finish();
        console.error('Archive download failed');
        controller.error(new Error('Archive download failed'));
      }
    },
    async cancel(reason) {
      try { await activeReader?.cancel(reason); }
      finally { try { await iterator.return(); } finally { finish(); } }
    },
  }, { highWaterMark: 0 });
}
