-- Members, Vehicles, Checklists extension
-- Run in Supabase SQL Editor or via: npx supabase db push

-- Members
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  date_of_birth date,
  date_joined date,
  cert_level text default 'None',
  cert_number text,
  cert_expiration date,
  emergency_contact_name text,
  emergency_contact_phone text,
  status text not null default 'Trainee'
    check (status in ('Primary','Backup','Observer','Trainee','Inactive')),
  notes text,
  created_at timestamptz not null default now()
);

-- Vehicles
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  call_sign text not null,
  type text not null
    check (type in ('Ambulance','QRV','POV')),
  mileage integer,
  last_service date,
  next_service date,
  purchase_date date,
  purchase_price numeric(10,2),
  description text,
  created_at timestamptz not null default now()
);

-- Checklist templates (one per member status or vehicle type)
create table if not exists public.checklists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_type text not null
    check (target_type in ('member_status','vehicle_type')),
  target_value text not null,
  created_at timestamptz not null default now(),
  constraint checklists_unique_target unique (target_type, target_value)
);

-- Checklist items
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists(id) on delete cascade,
  item_name text not null,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.members       enable row level security;
alter table public.vehicles      enable row level security;
alter table public.checklists    enable row level security;
alter table public.checklist_items enable row level security;

-- Members policies
create policy "members_read_authorized" on public.members
  for select to authenticated using (public.current_user_role() is not null);

create policy "members_write_admin_supply" on public.members
  for all to authenticated
  using (public.can_write_inventory())
  with check (public.can_write_inventory());

create policy "members_delete_admin" on public.members
  for delete to authenticated using (public.is_admin());

-- Vehicles policies
create policy "vehicles_read_authorized" on public.vehicles
  for select to authenticated using (public.current_user_role() is not null);

create policy "vehicles_write_admin_supply" on public.vehicles
  for all to authenticated
  using (public.can_write_inventory())
  with check (public.can_write_inventory());

create policy "vehicles_delete_admin" on public.vehicles
  for delete to authenticated using (public.is_admin());

-- Checklists policies
create policy "checklists_read_authorized" on public.checklists
  for select to authenticated using (public.current_user_role() is not null);

create policy "checklists_write_admin_supply" on public.checklists
  for all to authenticated
  using (public.can_write_inventory())
  with check (public.can_write_inventory());

-- Checklist items policies
create policy "checklist_items_read_authorized" on public.checklist_items
  for select to authenticated using (public.current_user_role() is not null);

create policy "checklist_items_write_admin_supply" on public.checklist_items
  for all to authenticated
  using (public.can_write_inventory())
  with check (public.can_write_inventory());

-- Seed the 8 default checklist templates
insert into public.checklists (name, target_type, target_value) values
  ('Primary Member Checklist',  'member_status', 'Primary'),
  ('Backup Member Checklist',   'member_status', 'Backup'),
  ('Observer Checklist',        'member_status', 'Observer'),
  ('Trainee Checklist',         'member_status', 'Trainee'),
  ('Inactive Member Checklist', 'member_status', 'Inactive'),
  ('Ambulance Checklist',       'vehicle_type',  'Ambulance'),
  ('QRV Checklist',             'vehicle_type',  'QRV'),
  ('POV Checklist',             'vehicle_type',  'POV')
on conflict (target_type, target_value) do nothing;
