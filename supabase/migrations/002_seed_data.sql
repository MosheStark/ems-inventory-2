-- Starter EMS inventory data. Safe to run repeatedly.

insert into public.categories(name) values
  ('Airway'), ('Trauma'), ('PPE'), ('Medications'), ('Diagnostics'), ('Oxygen'), ('Equipment'), ('Training')
on conflict (name) do nothing;

insert into public.locations(name) values
  ('Ambulance 1'), ('Fly Car'), ('Jump Bag 1'), ('Jump Bag 2'), ('Medication Cabinet'), ('Supply Closet A'), ('Training Room')
on conflict (name) do nothing;

insert into public.items(sku, name, category_id, location_id, quantity, min_quantity, expiration_date, unit, vendor, lot_number, notes, active)
select 'AIR-BVM-ADULT', 'Adult BVM', c.id, l.id, 4, 3, date '2028-03-31', 'each', 'Bound Tree', 'BVM-2401', 'Adult size, with mask', true
from public.categories c, public.locations l
where c.name = 'Airway' and l.name = 'Supply Closet A'
on conflict do nothing;

insert into public.items(sku, name, category_id, location_id, quantity, min_quantity, expiration_date, unit, vendor, lot_number, notes, active)
select 'PPE-GLOVE-L', 'Nitrile Gloves - Large', c.id, l.id, 12, 20, null, 'box', 'Henry Schein', null, 'Restock immediately', true
from public.categories c, public.locations l
where c.name = 'PPE' and l.name = 'Ambulance 1'
on conflict do nothing;

insert into public.items(sku, name, category_id, location_id, quantity, min_quantity, expiration_date, unit, vendor, lot_number, notes, active)
select 'TRAUMA-ISRAELI-4', 'Israeli Bandage', c.id, l.id, 8, 6, date '2026-07-15', 'each', 'Rescue Essentials', 'TR-8842', '4-inch trauma dressing', true
from public.categories c, public.locations l
where c.name = 'Trauma' and l.name = 'Jump Bag 2'
on conflict do nothing;

insert into public.items(sku, name, category_id, location_id, quantity, min_quantity, expiration_date, unit, vendor, lot_number, notes, active)
select 'MED-GLUCOSE', 'Oral Glucose', c.id, l.id, 5, 4, date '2026-06-01', 'tube', 'McKesson', 'GL-2026-1', 'Check monthly', true
from public.categories c, public.locations l
where c.name = 'Medications' and l.name = 'Medication Cabinet'
on conflict do nothing;
