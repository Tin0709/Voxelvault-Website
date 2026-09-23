begin;
create function public.claim_unused_upload(p_owner uuid,p_upload uuid)
returns public.upload_sessions language plpgsql security definer set search_path='' as $$
declare result public.upload_sessions;
begin
  -- Same account lock as publish/profile save: a file cannot become attached mid-delete.
  perform 1 from public.storage_accounts where owner_id=p_owner for update;
  select * into result from public.upload_sessions where id=p_upload and owner_id=p_owner for update;
  if not found then raise exception 'Upload not found'; end if;
  if result.status not in ('ready','deleting') or result.post_id is not null
    or exists(select 1 from public.post_images where upload_id=p_upload)
    or exists(select 1 from public.attachments where upload_id=p_upload)
    or exists(select 1 from public.profiles where avatar_upload_id=p_upload or cover_upload_id=p_upload)
  then raise exception 'This upload is in use or still uploading'; end if;
  update public.upload_sessions set status='deleting' where id=p_upload returning * into result;
  return result;
end;
$$;
revoke all on function public.claim_unused_upload(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_unused_upload(uuid,uuid) to service_role;
commit;
