-- オンラインランキングに game_version カラムを追加し、既存テストデータを 'legacy' として分離するマイグレーション
-- 既存データを削除せずに残したまま、現行バージョン ('1.0.0') のランキングのみ表示できるようにします。
-- Supabase の SQL Editor に貼り付けて「Run」してください（フロント側デプロイ前に実行推奨）。

alter table public.rankings
  add column if not exists game_version text not null default 'legacy';

alter table public.rankings
  alter column game_version set default '1.0.0';

alter table public.rankings
  drop constraint if exists rankings_game_version_check;

alter table public.rankings
  add constraint rankings_game_version_check
  check (char_length(btrim(game_version)) between 1 and 24);

create index if not exists idx_rankings_version_overall
  on public.rankings (game_version, is_inf desc, max_damage desc, reached_floor desc, created_at asc);

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
    and char_length(btrim(game_version)) between 1 and 24
  );
