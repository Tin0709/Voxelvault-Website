import {createId} from '../../lib/createId';
import { confirmAction } from '../../lib/confirm';
function ExternalDownloadsEditor({ links, onChange }) {
  const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

  function update(id, field, value) {
    onChange(links.map((link) => link.id === id ? { ...link, [field]: value } : link));
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="font-headline-lg text-xl">External download links</h2>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
        Use Google Drive, MEGA or another host for large files. These links are for your
        owner view; original source credit is entered separately below.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
        VoxelVault stores the link, not the file. Access at the destination depends on
        that service’s sharing settings. Anyone with a shared link may be able to open it.
      </p>
      {links.length === 0 && <p className="mt-5 text-sm text-on-surface-variant">No external links added.</p>}
      <div className="mt-5 space-y-4">
        {links.map((link, index) => (
          <fieldset key={link.id} className="min-w-0 rounded-xl border border-white/10 p-4">
            <legend className="px-2 text-sm text-primary">Link {index + 1}</legend>
            <label className="block text-sm">File or folder name
              <input value={link.name} onChange={(event) => update(link.id, "name", event.target.value)} required maxLength={120}
                placeholder="e.g. World backup" className={inputClass} />
            </label>
            <label className="mt-4 block text-sm">External download URL
              <input type="url" value={link.url} onChange={(event) => update(link.id, "url", event.target.value)} required maxLength={4096}
                placeholder="https://drive.google.com/... or https://mega.nz/..." className={inputClass} />
            </label>
            <button type="button" onClick={async() => {if(await confirmAction('Remove this external link?'))onChange(links.filter((item) => item.id !== link.id));}}
              aria-label={`Remove external link ${index + 1}`}
              className="mt-3 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-400/10">Remove link</button>
          </fieldset>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...links, { id: createId(), name: "", url: "" }])}
        className="mt-5 w-full rounded-xl border border-dashed border-primary/40 px-4 py-3 text-sm text-primary hover:bg-primary/5">
        + Add external download link
      </button>
    </section>
  );
}

export default ExternalDownloadsEditor;
