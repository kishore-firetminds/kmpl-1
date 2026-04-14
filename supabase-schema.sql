-- KMPL core tables for cross-device persistent auth + profiles

create table if not exists public.players (
  id text primary key,
  person_id text not null,
  role text not null default 'player',
  name text not null,
  photo text,
  email text,
  mobile text not null,
  jersey_number text,
  jersey_size text,
  jersey_name text,
  village text,
  assigned_team_owner_id text,
  assigned_team_name text,
  player_points integer not null default 0,
  password text not null,
  fee_paid integer not null default 310,
  payment_ref text,
  registered_at timestamptz not null default now()
);

create index if not exists idx_players_mobile on public.players (mobile);
create index if not exists idx_players_email on public.players (email);
create index if not exists idx_players_person_id on public.players (person_id);
create index if not exists idx_players_registered_at on public.players (registered_at desc);

create table if not exists public.team_owners (
  id text primary key,
  person_id text not null,
  role text not null default 'team_owner',
  owner_name text not null,
  team_name text not null,
  logo text,
  jersey_design text,
  email text,
  jersey_pattern text,
  owner_mobile text not null,
  auction_budget integer not null default 100000,
  password text not null,
  fee_paid integer not null default 5100,
  payment_ref text,
  registered_at timestamptz not null default now()
);

create index if not exists idx_team_owners_mobile on public.team_owners (owner_mobile);
create index if not exists idx_team_owners_email on public.team_owners (email);
create index if not exists idx_team_owners_person_id on public.team_owners (person_id);
create index if not exists idx_team_owners_registered_at on public.team_owners (registered_at desc);

create table if not exists public.super_admins (
  id text primary key,
  person_id text,
  role text not null default 'super_admin',
  name text not null,
  email text not null unique,
  password text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_super_admins_created_at on public.super_admins (created_at desc);

create table if not exists public.app_settings (
  id text primary key,
  show_team_owner_player_list boolean not null default false,
  auction_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional hardening:
-- alter table public.players enable row level security;
-- alter table public.team_owners enable row level security;
-- alter table public.super_admins enable row level security;
-- For this app, server APIs use service-role key so RLS is bypassed server-side.


-- Migration for existing DBs:
alter table public.players add column if not exists jersey_number text;
alter table public.players add column if not exists assigned_team_owner_id text;
alter table public.players add column if not exists assigned_team_name text;
alter table public.players add column if not exists player_points integer not null default 0;
alter table public.team_owners add column if not exists jersey_design text;
alter table public.team_owners add column if not exists auction_budget integer not null default 100000;

