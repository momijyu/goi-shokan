-- Issue #12: 混沌の無作為迷宮 (stage_random)・一文即興の迷宮 (stage_impromptu) をオンラインランキングへ登録可能にするマイグレーション
-- 既に public.rankings テーブルを作成済みの場合、Supabase の SQL Editor で以下を実行してください

alter table public.rankings
  drop constraint if exists rankings_stage_id_check;

alter table public.rankings
  add constraint rankings_stage_id_check
  check (stage_id in ('stage_1', 'stage_2', 'stage_3', 'stage_random', 'stage_impromptu'));

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
