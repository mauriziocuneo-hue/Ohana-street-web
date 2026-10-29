-- Operational orders: separate table, no demo migration or data copy.
create table public.ohana_orders (
 id text primary key check(id ~ '^OHANA-[A-F0-9]{8,32}$'),
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload->>'id'=id and coalesce(payload->>'environment','')='live' and octet_length(payload::text)<60000),
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 updated_by uuid not null
);
alter table public.ohana_orders enable row level security;
revoke all on public.ohana_orders from public,anon,authenticated;
grant select,insert,update on public.ohana_orders to service_role;
create function public.ohana_save_order(p_id text,p_payload jsonb,p_revision integer,p_actor uuid)
returns setof public.ohana_orders language plpgsql security invoker set search_path='' as $$
begin
 if p_revision=0 then
  return query insert into public.ohana_orders(id,payload,updated_by) values(p_id,p_payload,p_actor) on conflict do nothing returning *;
 else
  return query update public.ohana_orders set payload=p_payload,revision=revision+1,updated_at=now(),updated_by=p_actor where id=p_id and revision=p_revision returning *;
 end if;
 if not found then raise exception 'revision_conflict' using errcode='40001';end if;
end;$$;
revoke all on function public.ohana_save_order(text,jsonb,integer,uuid) from public,anon,authenticated;
grant execute on function public.ohana_save_order(text,jsonb,integer,uuid) to service_role;

create policy deny_direct_access on public.ohana_orders for all to anon,authenticated using(false) with check(false);
