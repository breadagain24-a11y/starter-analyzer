-- Add fridge workflow columns to starters table
alter table public.starters
  add column if not exists fridge_status    text check (fridge_status in ('active', 'dormant')),
  add column if not exists fridge_removed_at timestamptz;
