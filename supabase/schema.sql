-- 語彙召喚(仮) オンラインランキング用テーブル・RLS設定
-- Supabase の SQL Editor にそのまま貼り付けて「Run」してください

create extension if not exists pgcrypto;

create table if not exists public.rankings (
  id uuid primary key default gen_random_uuid(),
  run_id text not null unique,
  player_name text not null check (char_length(btrim(player_name)) between 1 and 16),
  stage_id text not null check (stage_id in ('stage_1', 'stage_2', 'stage_3', 'stage_random', 'stage_impromptu')),
  stage_name text not null check (char_length(stage_name) between 1 and 40),
  is_daily boolean not null default false,
  daily_date text check (daily_date is null or daily_date ~ '^\d{4}-\d{2}-\d{2}$'),
  cleared boolean not null default false,
  reached_floor integer not null check (reached_floor between 1 and 9999),
  is_inf boolean not null default false,
  max_damage double precision not null check (
    max_damage >= 0
    and max_damage <= 1.79e308
    and not (max_damage = 'NaN'::double precision)
  ),
  relic_ids jsonb not null default '[]'::jsonb check (
    jsonb_typeof(relic_ids) = 'array'
    and jsonb_array_length(relic_ids) <= 100
  ),
  created_at timestamptz not null default now()
);

create index if not exists idx_rankings_overall
  on public.rankings (is_inf desc, max_damage desc, reached_floor desc, created_at asc);

create index if not exists idx_rankings_daily
  on public.rankings (is_daily, daily_date, is_inf desc, max_damage desc, reached_floor desc, created_at asc);

create index if not exists idx_rankings_stage
  on public.rankings (stage_id, is_inf desc, max_damage desc, reached_floor desc, created_at asc);

alter table public.rankings enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on table public.rankings to anon, authenticated;

drop policy if exists "rankings_select_public" on public.rankings;
create policy "rankings_select_public"
  on public.rankings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "rankings_insert_public" on public.rankings;
create policy "rankings_insert_public"
  on public.rankings
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(player_name)) between 1 and 16
    and stage_id in ('stage_1', 'stage_2', 'stage_3', 'stage_random', 'stage_impromptu')
    and char_length(stage_name) between 1 and 40
    and reached_floor between 1 and 9999
    and max_damage >= 0
    and max_damage <= 1.79e308
  );
