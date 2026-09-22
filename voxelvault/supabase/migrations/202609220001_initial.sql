-- Run once in Supabase SQL Editor, or apply with Supabase CLI migrations.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Member',
  bio text not null default '',
  created_at timestamptz not null default now()
);
create table public.storage_accounts (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  quota_bytes bigint not null default 200000000 check (quota_bytes >= 0)
);
create function public.on_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, name) values (
    new.id, left(coalesce(nullif(new.raw_user_meta_data->>'name',''), nullif(new.raw_user_meta_data->>'full_name',''), 'Member'), 50)
  );
  insert into public.storage_accounts(owner_id) values (new.id);
  return new;
end;
$$;
create trigger create_user_profile after insert on auth.users for each row execute function public.on_new_user();
insert into public.profiles(id, name)
select id, left(coalesce(nullif(raw_user_meta_data->>'name',''), 'Member'),50) from auth.users on conflict do nothing;
insert into public.storage_accounts(owner_id) select id from public.profiles on conflict do nothing;

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  title text not null check (length(trim(title)) between 1 and 120),
  description text not null default '',
  category text not null default 'uncategorized',
  location text not null default '',
  minecraft_version text not null default '',
  revision_notes text not null default '',
  original_creator text not null default '',
  original_source text not null default '',
  credit_url text not null default '' check (credit_url = '' or credit_url ~* '^https?://'),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Every upload reserves quota before bytes are accepted. These rows are also
-- durable cleanup jobs; never delete them before deleting the storage object.
create table public.upload_sessions (
  id uuid primary key,
  owner_id uuid not null references public.profiles(id),
  post_id uuid references public.posts(id) on delete set null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 0 and 50000000),
  kind text not null check (kind in ('image','attachment')),
  provider text not null check (provider in ('supabase','r2')),
  bucket text not null,
  object_key text not null unique,
  status text not null default 'pending' check (status in ('pending','ready','deleting')),
  created_at timestamptz not null default now()
);
create index upload_owner_idx on public.upload_sessions(owner_id);
create table public.post_images (
  post_id uuid not null references public.posts(id) on delete cascade,
  upload_id uuid not null unique references public.upload_sessions(id),
  position integer not null,
  alt text not null default '',
  primary key(post_id, position)
);
create table public.attachments (
  post_id uuid not null references public.posts(id) on delete cascade,
  upload_id uuid primary key references public.upload_sessions(id)
);
create table public.external_downloads (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  url text not null check (url ~* '^https?://')
);

alter table public.profiles enable row level security;
alter table public.storage_accounts enable row level security;
alter table public.posts enable row level security;
alter table public.upload_sessions enable row level security;
alter table public.post_images enable row level security;
alter table public.attachments enable row level security;
alter table public.external_downloads enable row level security;
-- Writes go through the authenticated Node API. Defense in depth for direct REST.
revoke all on public.profiles, public.storage_accounts, public.posts, public.upload_sessions,
 public.post_images, public.attachments, public.external_downloads from anon, authenticated;
grant select on public.profiles, public.posts, public.post_images to anon, authenticated;
grant select on public.storage_accounts, public.upload_sessions, public.attachments, public.external_downloads to authenticated;
grant all on public.profiles, public.storage_accounts, public.posts, public.upload_sessions,
 public.post_images, public.attachments, public.external_downloads to service_role;
create policy profiles_read on public.profiles for select using (true);
create policy posts_read on public.posts for select using (true);
create policy images_read on public.post_images for select using (true);
create policy quota_owner on public.storage_accounts for select to authenticated using (owner_id = (select auth.uid()));
create policy uploads_owner on public.upload_sessions for select to authenticated using (owner_id = (select auth.uid()));
create policy attachments_owner on public.attachments for select to authenticated using
 (exists(select 1 from public.posts p where p.id = post_id and p.owner_id = (select auth.uid())));
create policy links_owner on public.external_downloads for select to authenticated using
 (exists(select 1 from public.posts p where p.id = post_id and p.owner_id = (select auth.uid())));

create function public.reserve_upload(p_owner uuid, p_id uuid, p_name text, p_mime text, p_size bigint, p_kind text)
returns public.upload_sessions language plpgsql security definer set search_path = '' as $$
declare q bigint; used bigint; result public.upload_sessions; storage_provider text; storage_bucket text;
begin
  select quota_bytes into q from public.storage_accounts where owner_id = p_owner for update;
  if q is null then raise exception 'Account unavailable'; end if;
  if p_size < 0 or p_size > 50000000 or p_kind not in ('image','attachment') then raise exception 'Invalid upload'; end if;
  select coalesce(sum(size_bytes),0) into used from public.upload_sessions where owner_id = p_owner;
  if used + p_size > q then raise exception 'Storage quota exceeded'; end if;
  storage_provider := case when p_kind = 'image' or p_size <= 5000000 then 'supabase' else 'r2' end;
  storage_bucket := case when p_kind = 'image' then 'showcase' else 'attachments' end;
  insert into public.upload_sessions(id,owner_id,original_name,mime_type,size_bytes,kind,provider,bucket,object_key)
  values(p_id,p_owner,p_name,p_mime,p_size,p_kind,storage_provider,storage_bucket,p_owner::text||'/'||p_id::text)
  returning * into result;
  return result;
end;
$$;

create function public.save_post(p_owner uuid, p_id uuid, p_version integer, p_post jsonb, p_images jsonb, p_attachments jsonb, p_links jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare existing public.posts; item jsonb; f public.upload_sessions; image_ids uuid[] := '{}'; attachment_ids uuid[] := '{}'; n integer := 0;
begin
  perform 1 from public.storage_accounts where owner_id = p_owner for update;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into existing from public.posts where id = p_id for update;
  if found and (existing.owner_id <> p_owner or existing.version <> p_version) then raise exception 'Post changed or access denied'; end if;
  if existing.id is null and p_version <> 0 then raise exception 'Post no longer exists'; end if;
  if jsonb_array_length(p_images) < 1 or jsonb_array_length(p_images) > 30 then raise exception 'Use 1 to 30 images'; end if;
  if jsonb_array_length(p_attachments) > 50 or jsonb_array_length(p_links) > 50 then raise exception 'Too many files or links'; end if;
  for item in select * from jsonb_array_elements(p_images) loop
    select * into f from public.upload_sessions where id = (item->>'id')::uuid for update;
    if not found or f.owner_id <> p_owner or f.kind <> 'image' or f.status <> 'ready' or (f.post_id is not null and f.post_id <> p_id) then raise exception 'Invalid image'; end if;
    image_ids := array_append(image_ids,f.id);
  end loop;
  for item in select * from jsonb_array_elements(p_attachments) loop
    select * into f from public.upload_sessions where id = (item->>'id')::uuid for update;
    if not found or f.owner_id <> p_owner or f.kind <> 'attachment' or f.status <> 'ready' or (f.post_id is not null and f.post_id <> p_id) then raise exception 'Invalid attachment'; end if;
    attachment_ids := array_append(attachment_ids,f.id);
  end loop;
  insert into public.posts(id,owner_id,title,description,category,location,minecraft_version,revision_notes,original_creator,original_source,credit_url)
  values(p_id,p_owner,p_post->>'title',p_post->>'description',p_post->>'category',p_post->>'location',p_post->>'minecraftVersion',p_post->>'revisionNotes',p_post->>'originalCreator',p_post->>'originalSource',p_post->>'creditUrl')
  on conflict(id) do update set title=excluded.title, description=excluded.description, category=excluded.category,
   location=excluded.location, minecraft_version=excluded.minecraft_version, revision_notes=excluded.revision_notes,
   original_creator=excluded.original_creator, original_source=excluded.original_source, credit_url=excluded.credit_url,
   version=public.posts.version+1, updated_at=now();
  delete from public.post_images where post_id=p_id;
  delete from public.attachments where post_id=p_id;
  delete from public.external_downloads where post_id=p_id;
  update public.upload_sessions set status='deleting',post_id=null
    where post_id=p_id and not(id=any(image_ids||attachment_ids));
  update public.upload_sessions set post_id=p_id where id=any(image_ids||attachment_ids);
  for item in select * from jsonb_array_elements(p_images) loop
    insert into public.post_images values(p_id,(item->>'id')::uuid,n,coalesce(item->>'alt','')); n:=n+1;
  end loop;
  insert into public.attachments select p_id,unnest(attachment_ids);
  for item in select * from jsonb_array_elements(p_links) loop
    insert into public.external_downloads(post_id,name,url) values(p_id,item->>'name',item->>'url');
  end loop;
  return p_id;
end;
$$;

create function public.delete_post(p_owner uuid,p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.storage_accounts where owner_id=p_owner for update;
  if not exists(select 1 from public.posts where id=p_id and owner_id=p_owner) then raise exception 'Access denied'; end if;
  update public.upload_sessions set status='deleting',post_id=null where post_id=p_id;
  delete from public.posts where id=p_id;
end;
$$;
revoke all on function public.on_new_user() from public,anon,authenticated;
revoke all on function public.reserve_upload(uuid,uuid,text,text,bigint,text) from public,anon,authenticated;
revoke all on function public.save_post(uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.delete_post(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_upload(uuid,uuid,text,text,bigint,text),
 public.save_post(uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb), public.delete_post(uuid,uuid) to service_role;

-- No browser writes to storage.objects: only the API's service role uploads.
create function public.claim_cleanup(p_owner uuid) returns setof public.upload_sessions
language plpgsql security definer set search_path = '' as $$
begin
  -- Same lock as save_post prevents cleanup racing a publish operation.
  perform 1 from public.storage_accounts where owner_id=p_owner for update;
  update public.upload_sessions set status='deleting'
    where owner_id=p_owner and post_id is null and created_at < now()-interval '24 hours';
  return query select * from public.upload_sessions where owner_id=p_owner and status='deleting';
end;
$$;
revoke all on function public.claim_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.claim_cleanup(uuid) to service_role;

create function public.storage_usage(p_owner uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('quotaBytes',a.quota_bytes,'usedBytes',
    (select coalesce(sum(size_bytes),0) from public.upload_sessions where owner_id=p_owner))
  from public.storage_accounts a where owner_id=p_owner;
$$;
revoke all on function public.storage_usage(uuid) from public,anon,authenticated;
grant execute on function public.storage_usage(uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('showcase','showcase',true,50000000,array['image/jpeg','image/png','image/webp','image/avif','image/gif']),
 ('attachments','attachments',false,5000000,null);
commit;
