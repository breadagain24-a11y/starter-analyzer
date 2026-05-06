-- ============================================================
-- Breadagain Starter Analyzer — Supabase Schema
-- Run this in the Supabase SQL editor (supabase.com → project → SQL)
-- ============================================================

-- User profiles (extends auth.users with app-specific fields)
create table if not exists public.user_profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  name            text not null default '',
  tier            text not null default 'free' check (tier in ('free', 'pro', 'pro_annual')),
  stripe_customer_id text,
  created_at      timestamptz default now()
);

-- Starters
create table if not exists public.starters (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  name                text not null,
  age                 text not null,
  flour_type          text[] not null default '{}',
  water_type          text not null,
  target_hydration    integer not null default 100,
  last_analyzed_at    timestamptz,
  fridge_status       text check (fridge_status in ('active', 'dormant')),
  fridge_removed_at   timestamptz,
  created_at          timestamptz default now()
);

-- Analyses
create table if not exists public.analyses (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  starter_id          uuid references public.starters(id) on delete cascade not null,
  starter_name        text not null,
  image_url           text not null,
  questionnaire_data  jsonb not null,
  ai_result           jsonb not null,
  created_at          timestamptz default now()
);

-- Feed entries
create table if not exists public.feed_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  starter_id      uuid references public.starters(id) on delete cascade not null,
  starter_name    text not null,
  ratio           text not null,
  rise_multiplier text not null default '',
  peak_time       text not null default '',
  room_temp       integer not null default 20,
  note            text not null default '',
  image_url       text,
  created_at      timestamptz default now()
);

-- Starter notes
create table if not exists public.starter_notes (
  id          uuid primary key default gen_random_uuid(),
  starter_id  uuid references public.starters(id) on delete cascade not null,
  text        text not null,
  created_at  timestamptz default now()
);

-- Feeding reminders
create table if not exists public.feeding_reminders (
  id              uuid primary key default gen_random_uuid(),
  starter_id      uuid references public.starters(id) on delete cascade not null,
  starter_name    text not null,
  feed_at         timestamptz not null,
  notified        boolean not null default false
);

-- Journeys (starter incubation 14-day tracking)
create table if not exists public.journeys (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references auth.users(id) on delete cascade not null,
  name                    text not null,
  flour_type              text[] not null default '{}',
  water_type              text not null,
  target_hydration        integer not null default 100,
  start_date              timestamptz not null,
  current_day             integer not null default 1,
  logs                    jsonb not null default '[]',
  status                  text not null default 'active' check (status in ('active', 'graduated', 'abandoned')),
  graduated_starter_id    uuid references public.starters(id),
  created_at              timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────

alter table public.user_profiles     enable row level security;
alter table public.starters          enable row level security;
alter table public.analyses          enable row level security;
alter table public.feed_entries      enable row level security;
alter table public.starter_notes     enable row level security;
alter table public.feeding_reminders enable row level security;
alter table public.journeys          enable row level security;

-- user_profiles
create policy "own profile read"   on public.user_profiles for select using (auth.uid() = id);
create policy "own profile update" on public.user_profiles for update using (auth.uid() = id);

-- starters
create policy "own starters all" on public.starters for all using (auth.uid() = user_id);

-- analyses
create policy "own analyses all" on public.analyses for all using (auth.uid() = user_id);

-- feed_entries
create policy "own feeds all" on public.feed_entries for all using (auth.uid() = user_id);

-- starter_notes (scoped via starter ownership)
create policy "own notes all" on public.starter_notes for all using (
  exists (select 1 from public.starters where id = starter_notes.starter_id and user_id = auth.uid())
);

-- feeding_reminders
create policy "own reminders all" on public.feeding_reminders for all using (
  exists (select 1 from public.starters where id = feeding_reminders.starter_id and user_id = auth.uid())
);

-- journeys
create policy "own journeys all" on public.journeys for all using (auth.uid() = user_id);

-- ── Auto-create profile on signup ────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Storage bucket ────────────────────────────────────────────
-- Run separately in Supabase dashboard → Storage → New bucket:
--   Name: analysis-images
--   Public: true
--
-- Then add this storage policy:
-- create policy "Users can upload own images"
--   on storage.objects for insert
--   with check (bucket_id = 'analysis-images' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Public read analysis images"
--   on storage.objects for select
--   using (bucket_id = 'analysis-images');
