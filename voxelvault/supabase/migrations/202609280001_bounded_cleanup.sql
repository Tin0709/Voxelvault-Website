begin;

create function public.claim_cleanup(p_owner uuid, p_limit integer)
returns setof public.upload_sessions
language plpgsql security definer set search_path = '' as $$
begin
  -- Never let NULL become an unlimited SQL LIMIT. Zero/negative claims are no-ops.
  if p_limit is null or p_limit <= 0 then return; end if;
  -- Preserve serialization with publish/profile/draft operations for this owner.
  perform 1 from public.storage_accounts where owner_id=p_owner for update;
  return query
    with candidates as materialized (
      select u.id from public.upload_sessions u
      where u.owner_id=p_owner
        and not exists(select 1 from public.profiles p
          where p.avatar_upload_id=u.id or p.cover_upload_id=u.id)
        and (
          (u.status='pending' and u.created_at<now()-interval '24 hours')
          or (u.draft_id is null and (
            u.status='deleting'
            or (u.post_id is null and u.created_at<now()-interval '24 hours')
          ))
        )
      -- No retry timestamp exists. Fresh random selection prevents a fixed failed
      -- prefix from monopolizing every batch; it does not promise a retry deadline.
      order by random()
      limit least(p_limit,5)
    )
    update public.upload_sessions u set draft_id=null,status='deleting'
      from candidates c where u.id=c.id
      returning u.*;
end;
$$;

revoke all on function public.claim_cleanup(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_cleanup(uuid,integer) to service_role;

-- Retain the Node caller's API without retaining an unbounded overload.
create or replace function public.claim_cleanup(p_owner uuid)
returns setof public.upload_sessions
language sql security definer set search_path = '' as $$
  select * from public.claim_cleanup(p_owner,5);
$$;
revoke all on function public.claim_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.claim_cleanup(uuid) to service_role;

commit;
