-- EMS Inventory Management schema + RLS policies
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin', 'supply', 'member');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.stock_movement_type as enum ('restock', 'usage', 'discard', 'correction');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  sku text,
  name text not null,
  category_id uuid references public.categories(id),
  location_id uuid references public.locations(id),
  quantity integer not null default 0 check (quantity >= 0),
  min_quantity integer not null default 0 check (min_quantity >= 0),
  expiration_date date,
  unit text not null default 'each',
  vendor text,
  lot_number text,
  notes text,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  movement_type public.stock_movement_type not null,
  quantity integer not null check (quantity > 0),
  previous_quantity integer not null check (previous_quantity >= 0),
  new_quantity integer not null check (new_quantity >= 0),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity text not null,
  entity_id uuid,
  detail text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_categories_updated_at on public.categories;
create trigger touch_categories_updated_at before update on public.categories
for each row execute function public.touch_updated_at();

drop trigger if exists touch_locations_updated_at on public.locations;
create trigger touch_locations_updated_at before update on public.locations
for each row execute function public.touch_updated_at();

drop trigger if exists touch_items_updated_at on public.items;
create trigger touch_items_updated_at before update on public.items
for each row execute function public.touch_updated_at();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.can_write_inventory()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'supply'), false);
$$;

create or replace function public.log_audit(action text, entity text, entity_id uuid, detail text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log(action, entity, entity_id, detail, created_by)
  values (log_audit.action, log_audit.entity, log_audit.entity_id, log_audit.detail, auth.uid());
end;
$$;

create or replace function public.apply_stock_movement(
  p_item_id uuid,
  p_movement_type public.stock_movement_type,
  p_quantity integer,
  p_note text default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items;
  v_new_quantity integer;
  v_movement public.stock_movements;
begin
  if not public.can_write_inventory() then
    raise exception 'Not authorized to adjust stock';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select * into v_item from public.items where id = p_item_id for update;
  if not found then
    raise exception 'Item not found';
  end if;

  if p_movement_type in ('usage', 'discard') then
    v_new_quantity := greatest(0, v_item.quantity - p_quantity);
  else
    v_new_quantity := v_item.quantity + p_quantity;
  end if;

  update public.items
  set quantity = v_new_quantity, updated_by = auth.uid()
  where id = p_item_id;

  insert into public.stock_movements(item_id, movement_type, quantity, previous_quantity, new_quantity, note, created_by)
  values (p_item_id, p_movement_type, p_quantity, v_item.quantity, v_new_quantity, p_note, auth.uid())
  returning * into v_movement;

  perform public.log_audit('Stock movement', 'items', p_item_id, p_movement_type::text || ': ' || p_quantity || ' for ' || v_item.name);

  return v_movement;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.audit_log enable row level security;

-- Profiles
create policy "profiles_read_own_or_admin" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_insert" on public.profiles
for insert to authenticated
with check (public.is_admin());

create policy "profiles_admin_update" on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Categories
create policy "categories_read_authorized" on public.categories
for select to authenticated
using (public.current_user_role() is not null);

create policy "categories_write_admin_supply" on public.categories
for all to authenticated
using (public.can_write_inventory())
with check (public.can_write_inventory());

-- Locations
create policy "locations_read_authorized" on public.locations
for select to authenticated
using (public.current_user_role() is not null);

create policy "locations_write_admin_supply" on public.locations
for all to authenticated
using (public.can_write_inventory())
with check (public.can_write_inventory());

-- Items
create policy "items_read_authorized" on public.items
for select to authenticated
using (public.current_user_role() is not null);

create policy "items_insert_admin_supply" on public.items
for insert to authenticated
with check (public.can_write_inventory());

create policy "items_update_admin_supply" on public.items
for update to authenticated
using (public.can_write_inventory())
with check (public.can_write_inventory());

create policy "items_delete_admin_only" on public.items
for delete to authenticated
using (public.is_admin());

-- Stock movements
create policy "movements_read_authorized" on public.stock_movements
for select to authenticated
using (public.current_user_role() is not null);

create policy "movements_insert_admin_supply" on public.stock_movements
for insert to authenticated
with check (public.can_write_inventory());

-- Audit log
create policy "audit_read_authorized" on public.audit_log
for select to authenticated
using (public.current_user_role() is not null);

create policy "audit_insert_admin_supply" on public.audit_log
for insert to authenticated
with check (public.can_write_inventory());
