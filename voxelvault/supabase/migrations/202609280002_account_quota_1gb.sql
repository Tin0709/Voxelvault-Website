begin;

-- Decimal 1 GB for new accounts. Reservation/reporting RPCs read this column.
alter table public.storage_accounts alter column quota_bytes set default 1000000000;

-- Raise existing accounts without touching usage, reservations or higher quotas.
update public.storage_accounts set quota_bytes=1000000000
where quota_bytes<1000000000;

commit;
