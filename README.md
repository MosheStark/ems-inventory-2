# EMS Inventory Management — Supabase Version

A gated EMS inventory management app using React/Vite + Supabase Auth + Supabase Postgres + Row Level Security.

## Features

- Login required before inventory is visible
- Supabase Auth-backed user profiles
- Role-based access control:
  - `admin`: manage users, categories, locations, inventory, stock movements, exports
  - `supply`: manage inventory and stock movements, export reports
  - `member`: read-only access
- Inventory items with category, location, quantity, minimum quantity, expiration date, vendor, lot number, notes
- Stock adjustments: restock, usage, discard, correction
- Low-stock, expired, and expiring-soon alerts
- Stock movement history
- Audit log
- CSV export
- Supabase SQL schema and RLS policies included

## Setup

### 1. Create Supabase project

Create a Supabase project, then go to **Project Settings → API** and copy:

- Project URL
- anon public key

### 2. Configure local environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then update:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
```

### 3. Run SQL schema

Open Supabase → **SQL Editor** and run:

```sql
supabase/migrations/001_schema_and_rls.sql
```

Then run:

```sql
supabase/migrations/002_seed_data.sql
```

### 4. Create first admin user

1. In Supabase Auth, create or invite your first user.
2. Copy that user's Auth UUID.
3. Run this SQL, replacing the values:

```sql
insert into public.profiles (id, full_name, role)
values ('AUTH-USER-UUID-HERE', 'Your Name', 'admin')
on conflict (id) do update set role = 'admin', full_name = excluded.full_name;
```

Without a matching `profiles` row, a signed-in user will not see app data.

### 5. Run the app

```bash
npm install
npm run dev
```

## Production Deployment

Recommended:

- Host frontend on Vercel
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel environment variables
- Keep Supabase RLS enabled
- Add users through Supabase Auth, then assign them roles in the app or by SQL

## Security Notes

The app is gated at two layers:

1. Frontend: no authenticated session = no app access
2. Database: Row Level Security policies restrict table access by profile role

The anon key is safe to expose in a browser app when RLS is correctly enabled. Do **not** expose your Supabase service role key in this frontend app.
