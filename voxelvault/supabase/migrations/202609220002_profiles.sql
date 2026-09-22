begin;
alter table public.profiles add column country text not null default '';
alter table public.profiles add column avatar_upload_id uuid references public.upload_sessions(id);
alter table public.profiles add column version integer not null default 0;

create function public.save_profile(p_owner uuid,p_name text,p_bio text,p_country text,p_avatar uuid,p_version integer)
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
    if not found or f.owner_id<>p_owner or f.kind<>'image' or f.status<>'ready' or f.post_id is not null or f.size_bytes>5000000 then raise exception 'Invalid avatar'; end if;
  end if;
  update public.profiles set name=trim(p_name),bio=p_bio,country=p_country,avatar_upload_id=p_avatar,version=version+1 where id=p_owner;
  if current_profile.avatar_upload_id is distinct from p_avatar then
    update public.upload_sessions set status='deleting' where id=current_profile.avatar_upload_id;
  end if;
end;
$$;
revoke all on function public.save_profile(uuid,text,text,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.save_profile(uuid,text,text,text,uuid,integer) to service_role;

create function public.protect_avatar() returns trigger language plpgsql set search_path='' as $$
begin
  if new.post_id is not null and exists(select 1 from public.profiles where avatar_upload_id=new.id) then
    raise exception 'Avatar cannot be attached to a post';
  end if;
  return new;
end;
$$;
create trigger protect_avatar before update of post_id on public.upload_sessions for each row execute function public.protect_avatar();

create or replace function public.claim_cleanup(p_owner uuid) returns setof public.upload_sessions
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.storage_accounts where owner_id=p_owner for update;
  update public.upload_sessions u set status='deleting'
    where owner_id=p_owner and post_id is null and created_at<now()-interval '24 hours'
    and not exists(select 1 from public.profiles p where p.avatar_upload_id=u.id);
  return query select u.* from public.upload_sessions u where owner_id=p_owner and status='deleting'
    and not exists(select 1 from public.profiles p where p.avatar_upload_id=u.id);
end;
$$;
commit;
