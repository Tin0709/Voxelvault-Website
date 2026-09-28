begin;

-- Raise only media counts: 50 images plus the existing 50 attachments.
-- All ownership, ready-state, concurrency and association checks are unchanged.
create or replace function public.save_post(p_owner uuid, p_id uuid, p_version integer, p_post jsonb, p_images jsonb, p_attachments jsonb, p_links jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare existing public.posts; item jsonb; f public.upload_sessions; image_ids uuid[] := '{}'; attachment_ids uuid[] := '{}'; n integer := 0;
begin
  perform 1 from public.storage_accounts where owner_id = p_owner for update;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into existing from public.posts where id = p_id for update;
  if found and (existing.owner_id <> p_owner or existing.version <> p_version) then raise exception 'Post changed or access denied'; end if;
  if existing.id is null and p_version <> 0 then raise exception 'Post no longer exists'; end if;
  if jsonb_array_length(p_images) < 1 or jsonb_array_length(p_images) > 50 then raise exception 'Use 1 to 50 images'; end if;
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

create or replace function public.save_draft(p_owner uuid,p_id uuid,p_version integer,p_payload jsonb,p_files uuid[]) returns public.drafts language plpgsql security definer set search_path='' as $$
declare result public.drafts;
begin
 perform 1 from public.storage_accounts where owner_id=p_owner for update;
 select * into result from public.drafts where id=p_id and owner_id=p_owner for update;
 if not found or result.version<>p_version then raise exception 'Draft changed on another device. Reload before saving.'; end if;
 if cardinality(p_files)>100 or pg_column_size(p_payload)>300000 then raise exception 'Draft is too large'; end if;
 if exists(select 1 from unnest(p_files) f(id) left join public.upload_sessions u on u.id=f.id where u.id is null or u.owner_id<>p_owner or u.status<>'ready' or (u.draft_id is not null and u.draft_id<>p_id)) then raise exception 'Invalid draft file'; end if;
 if exists(select 1 from public.profiles where avatar_upload_id=any(p_files) or cover_upload_id=any(p_files)) then raise exception 'Profile images cannot be draft files'; end if;
 update public.upload_sessions set draft_id=null where draft_id=p_id and not(id=any(p_files));
 update public.upload_sessions set draft_id=p_id where id=any(p_files);
 update public.drafts set payload=p_payload,version=version+1,updated_at=now() where id=p_id returning * into result;
 return result;
end; $$;

commit;
