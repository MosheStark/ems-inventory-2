-- Call log: tracks individual calls per member

create table if not exists public.call_log (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  call_date date not null default current_date,
  call_time time,
  incident_number text,
  call_type text,
  location text,
  disposition text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.call_log enable row level security;

create policy "call_log_read_authorized" on public.call_log
  for select to authenticated using (public.current_user_role() is not null);

create policy "call_log_write_admin_supply" on public.call_log
  for all to authenticated
  using (public.can_write_inventory())
  with check (public.can_write_inventory());

create policy "call_log_delete_admin" on public.call_log
  for delete to authenticated using (public.is_admin());

-- Auto-sync member.number_of_calls when call_log rows are inserted or deleted
create or replace function public.sync_member_call_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.members set number_of_calls = number_of_calls + 1 where id = NEW.member_id;
  elsif TG_OP = 'DELETE' then
    update public.members set number_of_calls = greatest(0, number_of_calls - 1) where id = OLD.member_id;
  end if;
  return null;
end;
$$;

drop trigger if exists call_log_count_sync on public.call_log;
create trigger call_log_count_sync
  after insert or delete on public.call_log
  for each row execute function public.sync_member_call_count();
