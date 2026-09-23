import {createId} from '../../lib/createId';
const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

function PostDownloadsEditor({ downloads, onChange }) {
  function addDownload() {
    onChange([
      ...downloads,
      {
        id: createId(),
        name: "",
        url: "",
        format: "",
        size: "",
      },
    ]);
  }

  function updateDownload(id, field, value) {
    onChange(
      downloads.map((download) =>
        download.id === id ? { ...download, [field]: value } : download,
      ),
    );
  }

  function removeDownload(id) {
    onChange(downloads.filter((download) => download.id !== id));
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline-lg text-xl">Downloadable files</h2>

          <p className="mt-2 text-sm text-on-surface-variant">
            Add a separate link for each downloadable file.
          </p>
        </div>

        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
          {downloads.length} files
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {downloads.map((download, index) => (
          <fieldset
            key={download.id}
            className="min-w-0 rounded-xl border border-white/10 p-4"
          >
            <legend className="px-2 text-sm text-primary">
              File {index + 1}
            </legend>

            <div className="space-y-4">
              <label className="block text-sm">
                Display name
                <input
                  value={download.name}
                  onChange={(event) =>
                    updateDownload(download.id, "name", event.target.value)
                  }
                  placeholder="e.g. Complete World Save"
                  required
                  maxLength={120}
                  className={inputClass}
                />
              </label>

              <label className="block text-sm">
                Download URL
                <input
                  type="url"
                  value={download.url}
                  onChange={(event) =>
                    updateDownload(download.id, "url", event.target.value)
                  }
                  placeholder="https://..."
                  required
                  className={inputClass}
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  Format — optional
                  <input
                    value={download.format}
                    onChange={(event) =>
                      updateDownload(download.id, "format", event.target.value)
                    }
                    placeholder="ZIP, LITEMATIC..."
                    className={inputClass}
                  />
                </label>

                <label className="block text-sm">
                  Size — optional
                  <input
                    value={download.size}
                    onChange={(event) =>
                      updateDownload(download.id, "size", event.target.value)
                    }
                    placeholder="e.g. 2.4 GB"
                    className={inputClass}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => removeDownload(download.id)}
                className="rounded-lg px-2 py-1 text-sm text-red-300 hover:bg-red-400/10"
              >
                Remove file
              </button>
            </div>
          </fieldset>
        ))}

        {downloads.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-on-surface-variant">
            No download links added. You can publish images without files.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={addDownload}
        className="mt-5 w-full rounded-xl border border-dashed border-primary/40 px-4 py-3 text-sm text-primary transition hover:bg-primary/5"
      >
        + Add download link
      </button>
    </section>
  );
}

export default PostDownloadsEditor;
