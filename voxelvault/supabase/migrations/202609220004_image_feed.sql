begin;
create function public.image_feed(p_seed text,p_after text default '',p_category text default '',p_search text default '',p_limit integer default 30)
returns table(image_id uuid,post_id uuid,title text,category text,creator text,creator_id uuid,object_key text,avatar_key text,alt text,sort_key text)
language sql stable security definer set search_path='' as $$
  select i.upload_id,p.id,p.title,p.category,pr.name,pr.id,u.object_key,a.object_key,i.alt,
    md5(i.upload_id::text || p_seed) || i.upload_id::text as sort_key
  from public.post_images i
  join public.posts p on p.id=i.post_id
  join public.profiles pr on pr.id=p.owner_id
  join public.upload_sessions u on u.id=i.upload_id and u.status='ready'
  left join public.upload_sessions a on a.id=pr.avatar_upload_id
  where (p_category='' or p.category=p_category)
    and (p_search='' or strpos(lower(concat_ws(' ',p.title,p.description,p.category,pr.name)),lower(p_search))>0)
    and md5(i.upload_id::text || p_seed) || i.upload_id::text > p_after
  order by sort_key
  limit least(greatest(p_limit,1),61);
$$;
revoke all on function public.image_feed(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.image_feed(text,text,text,text,integer) to service_role;
commit;
