begin;
alter table public.storage_accounts alter column quota_bytes set default 250000000;
update public.storage_accounts set quota_bytes=250000000;
create table public.drafts(id uuid primary key,owner_id uuid not null references public.profiles(id),payload jsonb not null default '{}',version integer not null default 0,updated_at timestamptz not null default now());
alter table public.drafts enable row level security;
revoke all on public.drafts from public,anon,authenticated;
grant all on public.drafts to service_role;
create index drafts_owner_idx on public.drafts(owner_id);
alter table public.upload_sessions add column draft_id uuid references public.drafts(id) on delete set null;
create index uploads_draft_idx on public.upload_sessions(draft_id);
create or replace function public.reserve_upload(p_owner uuid, p_id uuid, p_name text, p_mime text, p_size bigint, p_kind text)
returns public.upload_sessions language plpgsql security definer set search_path = '' as $$
declare q bigint; used bigint; image_used bigint; result public.upload_sessions; storage_provider text; storage_bucket text;
begin
  select quota_bytes into q from public.storage_accounts where owner_id = p_owner for update;
  if q is null then raise exception 'Account unavailable'; end if;
  if p_size < 0 or p_size > 50000000 or p_kind not in ('image','attachment') then raise exception 'Invalid upload'; end if;
  select coalesce(sum(size_bytes),0) into used from public.upload_sessions where owner_id = p_owner;
  if used + p_size > q then raise exception 'Storage quota exceeded'; end if;
  select coalesce(sum(size_bytes),0) into image_used from public.upload_sessions where owner_id=p_owner and kind='image' and provider='supabase';
  storage_provider := case when p_kind='image' then case when image_used+p_size<=50000000 then 'supabase' else 'r2' end when p_size<=5000000 then 'supabase' else 'r2' end;
  storage_bucket := 'attachments';
  insert into public.upload_sessions(id,owner_id,original_name,mime_type,size_bytes,kind,provider,bucket,object_key)
  values(p_id,p_owner,p_name,p_mime,p_size,p_kind,storage_provider,storage_bucket,p_owner::text||'/'||p_id::text)
  returning * into result;
  return result;
end;
$$;


create function public.prepare_draft(p_owner uuid,p_id uuid) returns public.drafts language plpgsql security definer set search_path='' as $$
declare result public.drafts;
begin
 perform 1 from public.storage_accounts where owner_id=p_owner for update;
 insert into public.drafts(id,owner_id) values(p_id,p_owner) on conflict do nothing;
 select * into result from public.drafts where id=p_id and owner_id=p_owner;
 if not found then raise exception 'Draft unavailable'; end if;
 return result;
end; $$;
create function public.reserve_draft_upload(p_owner uuid,p_id uuid,p_name text,p_mime text,p_size bigint,p_kind text,p_draft uuid) returns public.upload_sessions language plpgsql security definer set search_path='' as $$
declare result public.upload_sessions;
begin
 perform 1 from public.storage_accounts where owner_id=p_owner for update;
 if not exists(select 1 from public.drafts where id=p_draft and owner_id=p_owner) then raise exception 'Draft unavailable'; end if;
 result:=public.reserve_upload(p_owner,p_id,p_name,p_mime,p_size,p_kind);
 update public.upload_sessions set draft_id=p_draft where id=result.id returning * into result;
 return result;
end; $$;
create function public.save_draft(p_owner uuid,p_id uuid,p_version integer,p_payload jsonb,p_files uuid[]) returns public.drafts language plpgsql security definer set search_path='' as $$
declare result public.drafts;
begin
 perform 1 from public.storage_accounts where owner_id=p_owner for update;
 select * into result from public.drafts where id=p_id and owner_id=p_owner for update;
 if not found or result.version<>p_version then raise exception 'Draft changed on another device. Reload before saving.'; end if;
 if cardinality(p_files)>80 or pg_column_size(p_payload)>300000 then raise exception 'Draft is too large'; end if;
 if exists(select 1 from unnest(p_files) f(id) left join public.upload_sessions u on u.id=f.id where u.id is null or u.owner_id<>p_owner or u.status<>'ready' or (u.draft_id is not null and u.draft_id<>p_id)) then raise exception 'Invalid draft file'; end if;
 if exists(select 1 from public.profiles where avatar_upload_id=any(p_files) or cover_upload_id=any(p_files)) then raise exception 'Profile images cannot be draft files'; end if;
 update public.upload_sessions set draft_id=null where draft_id=p_id and not(id=any(p_files));
 update public.upload_sessions set draft_id=p_id where id=any(p_files);
 update public.drafts set payload=p_payload,version=version+1,updated_at=now() where id=p_id returning * into result;
 return result;
end; $$;
create function public.delete_draft(p_owner uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.storage_accounts where owner_id=p_owner for update;
 if exists(select 1 from public.drafts where id=p_id and owner_id<>p_owner) then raise exception 'Draft unavailable'; end if;
 update public.upload_sessions set draft_id=null,status=case when post_id is null then 'deleting' else status end where draft_id=p_id and owner_id=p_owner;
 delete from public.drafts where id=p_id and owner_id=p_owner;
end; $$;
create or replace function public.save_profile(p_owner uuid,p_name text,p_bio text,p_country text,p_avatar uuid,p_cover uuid,p_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare current_profile public.profiles; f public.upload_sessions;
begin
  perform 1 from public.storage_accounts where owner_id=p_owner for update;
  select * into current_profile from public.profiles where id=p_owner for update;
  if not found or current_profile.version <> p_version then raise exception 'Profile changed. Reload before saving.'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 50 or p_bio is null or length(p_bio)>1000
    or p_country is null or (p_country<>'' and p_country !~ '^[A-Z]{2}$') then raise exception 'Invalid profile'; end if;
  if p_avatar is not null then
    select * into f from public.upload_sessions where id=p_avatar for update;
    if not found or f.owner_id<>p_owner or f.kind<>'image' or f.status<>'ready' or f.post_id is not null or f.draft_id is not null or f.size_bytes>5000000 then raise exception 'Invalid avatar'; end if;
  end if;
  if p_cover is not null then
    select * into f from public.upload_sessions where id=p_cover for update;
    if not found or f.owner_id<>p_owner or f.kind<>'image' or f.status<>'ready' or f.post_id is not null or f.draft_id is not null or f.size_bytes>5000000 then raise exception 'Invalid cover'; end if;
  end if;
  update public.profiles set name=trim(p_name),bio=p_bio,country=p_country,avatar_upload_id=p_avatar,cover_upload_id=p_cover,version=version+1 where id=p_owner;
  update public.upload_sessions set status='deleting'
    where id in (current_profile.avatar_upload_id,current_profile.cover_upload_id)
    and id is distinct from p_avatar and id is distinct from p_cover;
end;
$$;

-- Removing media from a published post must not delete a saved draft's copy.
create function public.protect_draft_file() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='deleting' and new.draft_id is not null and old.status='ready' then new.status:='ready'; end if;
 return new;
end; $$;
create trigger preserve_draft_file before update on public.upload_sessions for each row execute function public.protect_draft_file();
create or replace function public.claim_cleanup(p_owner uuid) returns setof public.upload_sessions
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.storage_accounts where owner_id=p_owner for update;
  update public.upload_sessions set draft_id=null,status='deleting' where owner_id=p_owner and status='pending' and created_at<now()-interval '24 hours';
  update public.upload_sessions u set status='deleting'
    where owner_id=p_owner and draft_id is null and post_id is null and created_at<now()-interval '24 hours'
    and not exists(select 1 from public.profiles p where p.avatar_upload_id=u.id or p.cover_upload_id=u.id);
  return query select u.* from public.upload_sessions u where owner_id=p_owner and draft_id is null and status='deleting'
    and not exists(select 1 from public.profiles p where p.avatar_upload_id=u.id or p.cover_upload_id=u.id);
end;
$$;



create or replace function public.claim_unused_upload(p_owner uuid,p_upload uuid)
returns public.upload_sessions language plpgsql security definer set search_path='' as $$
declare result public.upload_sessions;
begin
  -- Same account lock as publish/profile save: a file cannot become attached mid-delete.
  perform 1 from public.storage_accounts where owner_id=p_owner for update;
  select * into result from public.upload_sessions where id=p_upload and owner_id=p_owner for update;
  if not found then raise exception 'Upload not found'; end if;
  if result.draft_id is not null or result.status not in ('ready','deleting') or result.post_id is not null
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


revoke all on function public.prepare_draft(uuid,uuid),public.reserve_draft_upload(uuid,uuid,text,text,bigint,text,uuid),public.save_draft(uuid,uuid,integer,jsonb,uuid[]),public.delete_draft(uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_draft(uuid,uuid),public.reserve_draft_upload(uuid,uuid,text,text,bigint,text,uuid),public.save_draft(uuid,uuid,integer,jsonb,uuid[]),public.delete_draft(uuid,uuid) to service_role;
commit;
