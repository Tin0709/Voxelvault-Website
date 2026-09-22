import { confirmAction } from '../lib/confirm';
import Icon, { FileIcon } from '../components/ui/Icon';
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import PostGallery from "../components/post/PostGallery";
import { useApi } from "../lib/useApi";
import { api, downloadFile, downloadArchive } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import RequestState from "../components/ui/RequestState";
import { formatBytes, safeCreditUrl } from "../utils/attachments";
import RelatedCreations from "../components/post/RelatedCreations";
import PostCredits from "../components/post/PostCredits";
import { notify } from '../lib/notifications';

function PostDetailPage() {
  const { id } = useParams();
  const [searchParams]=useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shareResult, setShareResult] = useState(null);
  const shareMessage = shareResult?.id === id ? shareResult.message : "";

  const { data: creation, loading, error } = useApi(`/posts/${encodeURIComponent(id)}`);
  const isOwner = Boolean(user && creation?.ownerId === user.id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareResult({ id, message: "Link copied!" });
      notify('The post link is on your clipboard.','success','Link copied');
    } catch {
      setShareResult({ id, message: "Please copy the link from your address bar." });
      notify('Please copy the link from your address bar.','info');
    }
  }

  if (loading || error) return <RequestState loading={loading} error={error} />;
  if (!creation) {
    return (
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-20 lg:px-10">
        <h1 className="font-headline-lg text-3xl">Creation not found</h1>

        <p className="mt-3 text-on-surface-variant">
          This link may be incorrect or the creation may have been removed.
        </p>

        <Link to="/" className="mt-6 inline-block text-primary">
          ← Back to Explore
        </Link>
      </main>
    );
  }

  const specifications = [
    ["Collection", creation.location],
    ["Minecraft version", creation.minecraftVersion],
  ].filter(([, value]) => Boolean(value));

  return (
    <main className="vault-page-enter mx-auto w-full max-w-[1500px] flex-1 px-6 pb-16 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-3 text-sm"
        >
          <Link
            to="/"
            className="shrink-0 text-on-surface-variant hover:text-primary"
          >
            ← Explore
          </Link>

          <span aria-hidden="true" className="text-white/25">
            /
          </span>

          <span className="capitalize text-on-surface">
            {creation.category}
          </span>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <span role="status" className="text-xs text-on-surface-variant">
            {shareMessage}
          </span>

          <button
            type="button"
            onClick={copyLink}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            <Icon name="link" className="mr-2 !h-4 !w-4"/>Share
          </button>
          {isOwner && <Link
            to={`/creations/${encodeURIComponent(creation.id)}/edit`}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:opacity-90"
          >
            <Icon name="edit" className="mr-2 !h-4 !w-4"/>Edit post
          </Link>}
          {isOwner && <button type="button" disabled={busy} className="rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-300"
            onClick={async () => {
              if (!await confirmAction('Delete this post and its uploaded files? This cannot be undone.','Delete post')) return;
              setBusy(true); setActionError('');
              try { await api(`/posts/${creation.id}`, { method: 'DELETE' }); navigate('/my-posts'); }
              catch (error) { setActionError(error.message); } finally { setBusy(false); }
            }}><Icon name="trash" className="mr-2 !h-4 !w-4"/>Delete post</button>}
        </div>
      </div>
      {actionError && <p role="alert" className="mb-5 text-red-300">{actionError}</p>}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-7 xl:col-span-8">
          <PostGallery key={creation.id+(searchParams.get('image')||'')} creation={{...creation,selectedImageId:searchParams.get('image')}} />

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              Behind the build
            </p>

            <h2 className="mt-3 font-headline-lg text-2xl">
              <Icon name="info" className="mr-3 text-primary"/>About this creation
            </h2>

            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
              {creation.description ||
                "The creator has not added a description yet."}
            </p>
          </section>
          {creation.revisionNotes&&<section className="vault-panel p-6 sm:p-8"><h2 className="flex items-center gap-2 text-xl"><Icon name="edit" className="text-primary"/>Notes & updates</h2><p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">{creation.revisionNotes}</p></section>}
        </div>

        <aside
          aria-label="Creation information"
          className="min-w-0 space-y-5 lg:col-span-5 xl:col-span-4"
        >
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              <Icon name="cube" className="mr-2 !h-4 !w-4"/>Creation archive
            </p>

            <h1 className="mt-4 break-words font-headline-lg text-3xl leading-tight tracking-tight">
              {creation.title}
            </h1>

            <div className="mt-6 flex items-center gap-3 rounded-xl bg-white/5 p-4">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary"
              >
                {creation.creatorAvatar ? <img src={creation.creatorAvatar} alt="" className="h-full w-full rounded-full object-cover"/> : creation.creator.slice(0, 1).toUpperCase()}
              </span>

              <div className="min-w-0">
                <p className="text-xs text-on-surface-variant">Posted by</p>
                {creation.creatorId ? (
                  <Link
                    to={`/creators/${encodeURIComponent(creation.creatorId)}`}
                    className="block break-words text-sm font-medium transition hover:text-primary"
                  >
                    {creation.creator}
                  </Link>
                ) : (
                  <p className="break-words text-sm font-medium">
                    {creation.creator}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-headline-lg text-xl"><Icon name="archive" className="text-primary"/>Personal archive</h2><span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">Owner only</span></div>

            <dl className="mt-5 space-y-4">
              {specifications.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-sm">
                  <dt className="text-on-surface-variant">{label}</dt>
                  <dd className="min-w-0 break-words text-right">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="flex items-center gap-2 font-medium"><Icon name="lock" className="!h-4 !w-4 text-primary"/>Private files</h3>
              {isOwner && creation.attachments?.length>0 && <div className="my-5"><button type="button" disabled={busy} onClick={async()=>{setBusy(true);setActionError('');try{await downloadArchive(creation);}catch(error){setActionError(error.message);notify(error.message,'error');}finally{setBusy(false);}}} className="vault-action flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 py-4 font-medium text-on-primary"><Icon name="download"/>{busy?'Preparing download…':'Download all as ZIP'}</button><p className="mt-2 text-center text-xs text-on-surface-variant">{creation.attachments.length} files · {formatBytes(creation.attachments.reduce((sum,file)=>sum+file.sizeBytes,0))} · Original files</p></div>}
              {!isOwner ? <p className="mt-3 text-sm text-on-surface-variant">Only the owner can access attachments and external download links.</p> : <>
                <ul className="mt-4 space-y-3">
                  {(creation.attachments ?? []).map((file) => <li key={file.id} className="break-words rounded-xl border border-white/5 bg-black/25 p-4">
                    <div className="flex items-center gap-3"><FileIcon name={file.originalName}/><div className="min-w-0"><p className="break-words text-sm font-medium">{file.originalName}</p><p className="mt-1 text-xs text-on-surface-variant">{formatBytes(file.sizeBytes)} · {file.originalName.split('.').pop().toUpperCase()}</p></div></div>
                    <button type="button" disabled={busy} className="mt-3 text-sm text-primary" onClick={async () => {
                      setBusy(true); setActionError('');
                      try { await downloadFile(file); } catch (error) { setActionError(error.message); } finally { setBusy(false); }
                    }}><Icon name="download" className="mr-2 !h-4 !w-4"/>{busy ? 'Please wait…' : 'Download file'}</button>
                  </li>)}
                </ul>
                {(creation.attachments ?? []).length === 0 && <p className="mt-3 text-sm text-on-surface-variant">No uploaded files.</p>}
                <h3 className="mt-6 font-medium"><Icon name="link" className="mr-2 !h-4 !w-4 text-primary"/>External downloads</h3>
                <ul className="mt-3 space-y-3">
                  {(creation.externalDownloads ?? []).map((link) => <li key={link.id} className="break-words">
                    {safeCreditUrl(link.url) && <a href={safeCreditUrl(link.url)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{link.name} ↗</a>}
                  </li>)}
                </ul>
                {(creation.externalDownloads ?? []).length === 0 && <p className="mt-3 text-sm text-on-surface-variant">No external links.</p>}
              </>}
            </div>
          </section>
          <PostCredits {...creation} />
        </aside>
      </div>
      <RelatedCreations creation={creation} />
    </main>
  );
}

export default PostDetailPage;
