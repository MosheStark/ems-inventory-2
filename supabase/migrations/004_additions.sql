-- Additions: new columns on members & vehicles, hospitals table

-- Members additions
alter table public.members
  add column if not exists avatar_url text,
  add column if not exists number_of_calls integer not null default 0,
  add column if not exists oos boolean not null default false;

-- Vehicles additions
alter table public.vehicles
  add column if not exists license_plate_number text,
  add column if not exists driver_license_number text,
  add column if not exists driver_license_state text,
  add column if not exists driver_license_expiration date,
  add column if not exists avatar_url text;

-- Hospitals
create table if not exists public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  fax text,
  email text,
  website text,
  specialties text,
  access_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.hospitals enable row level security;

create policy "hospitals_read_authorized" on public.hospitals
  for select to authenticated using (public.current_user_role() is not null);

create policy "hospitals_write_admin_supply" on public.hospitals
  for all to authenticated
  using (public.can_write_inventory())
  with check (public.can_write_inventory());

create policy "hospitals_delete_admin" on public.hospitals
  for delete to authenticated using (public.is_admin());
