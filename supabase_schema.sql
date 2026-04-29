-- RehabFlow Supabase schema
-- Paste this into the Supabase SQL editor (Project → SQL Editor → New query → Run).
--
-- Prerequisite: in the Supabase dashboard, enable anonymous sign-ins:
--   Authentication → Providers → Anonymous Sign-Ins → Enable.

create table if not exists public.profile (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  age        text,
  height     text,
  weight     text,
  level      text,
  gender     text,
  has_gym    boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  pain       int,
  swelling   int,
  mood       int,
  areas      text[] not null default '{}',
  completed  text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  weekly_goal_days int not null default 4,
  reminder_days    int[] not null default '{1,3,5}',
  reminder_time    text not null default '09:00',
  reminder_on      boolean not null default false,
  updated_at       timestamptz not null default now()
);

alter table public.profile     enable row level security;
alter table public.daily_logs  enable row level security;
alter table public.settings    enable row level security;

drop policy if exists "own profile"     on public.profile;
drop policy if exists "own daily_logs"  on public.daily_logs;
drop policy if exists "own settings"    on public.settings;

create policy "own profile"
  on public.profile for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own daily_logs"
  on public.daily_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own settings"
  on public.settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
