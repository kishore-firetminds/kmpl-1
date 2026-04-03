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
  password text not null,
  fee_paid integer not null default 310,
  payment_ref text,
  registered_at timestamptz not null default now()
);

create index if not exists idx_players_mobile on public.players (mobile);
create index if not exists idx_players_email on public.players (email);
create index if not exists idx_players_person_id on public.players (person_id);

create table if not exists public.team_owners (
  id text primary key,
  person_id text not null,
  role text not null default 'team_owner',
  owner_name text not null,
  team_name text not null,
  logo text,
  email text,
  jersey_pattern text,
  owner_mobile text not null,
  password text not null,
  fee_paid integer not null default 5100,
  payment_ref text,
  registered_at timestamptz not null default now()
);

create index if not exists idx_team_owners_mobile on public.team_owners (owner_mobile);
create index if not exists idx_team_owners_email on public.team_owners (email);
create index if not exists idx_team_owners_person_id on public.team_owners (person_id);

create table if not exists public.super_admins (
  id text primary key,
  person_id text,
  role text not null default 'super_admin',
  name text not null,
  email text not null unique,
  password text not null,
  created_at timestamptz not null default now()
);

-- Optional hardening:
-- alter table public.players enable row level security;
-- alter table public.team_owners enable row level security;
-- alter table public.super_admins enable row level security;
-- For this app, server APIs use service-role key so RLS is bypassed server-side.


-- Migration for existing DBs:
alter table public.players add column if not exists jersey_number text;

