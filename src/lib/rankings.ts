"use client";

import { getTodayJstDateKey } from "@/lib/bignum";
import type { RunHistoryEntry } from "@/types/game";

export type RankingGenre = "all" | "standard" | "daily" | "random" | "impromptu";

export const RANKING_GENRE_META: {
  id: RankingGenre;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: "all",
    label: "全体（全ルール）",
    shortLabel: "全体",
    description: "すべての迷宮・ルールを通じた総合トップ記録",
  },
  {
    id: "standard",
    label: "通常迷宮",
    shortLabel: "通常",
    description: "マイ辞書で挑む第一〜三層（日替わり除く）",
  },
  {
    id: "daily",
    label: "日替わり迷宮",
    shortLabel: "日替わり",
    description: "毎日同一シードで競う特別迷宮",
  },
  {
    id: "random",
    label: "混沌の無作為迷宮",
    shortLabel: "無作為",
    description: "マイ辞書不使用のランダム即席構築",
  },
  {
    id: "impromptu",
    label: "一文即興の迷宮",
    shortLabel: "一文即興",
    description: "1つの文章から生まれた語彙のみの限定戦",
  },
];

export function getRunRankingGenre(entry: {
  stageId: string;
  isDaily: boolean;
}): Exclude<RankingGenre, "all"> {
  if (entry.isDaily) return "daily";
  if (entry.stageId === "stage_random") return "random";
  if (entry.stageId === "stage_impromptu") return "impromptu";
  return "standard";
}

export interface RankingEntry {
  id: string;
  runId: string;
  playerName: string;
  stageId: string;
  stageName: string;
  isDaily: boolean;
  dailyDate: string | null;
  cleared: boolean;
  reachedFloor: number;
  maxDamage: number;
  relicIds: string[];
  createdAt: string;
}

interface RawRankingRow {
  id: string;
  run_id: string;
  player_name: string;
  stage_id: string;
  stage_name: string;
  is_daily: boolean;
  daily_date: string | null;
  cleared: boolean;
  reached_floor: number;
  is_inf: boolean;
  max_damage: number;
  relic_ids: string[] | null;
  created_at: string;
}

const MAX_FINITE_DB_DAMAGE = 1.79e308;

function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

function buildSupabaseHeaders(
  key: string,
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    ...extra,
  };
  // Only legacy JWT anon keys go in Authorization Bearer; sb_publishable_* keys must use apikey only.
  if (!key.startsWith("sb_publishable_")) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

export function isRankingConfigured(): boolean {
  return Boolean(getSupabaseConfig());
}

export interface SubmitRankingInput {
  runId: string;
  playerName: string;
  stageId: string;
  stageName: string;
  isDaily: boolean;
  dailyDate?: string | null;
  cleared: boolean;
  reachedFloor: number;
  maxDamage: number;
  relicIds: string[];
}

export async function submitRankingScore(
  input: SubmitRankingInput
): Promise<{ ok: boolean; error?: string }> {
  const cfg = getSupabaseConfig();
  if (!cfg) return { ok: false, error: "Supabase未設定" };
  if (!(input.maxDamage > 0) && !Number.isFinite(input.maxDamage)) {
    return { ok: false, error: "記録対象外" };
  }
  if (input.maxDamage <= 0) {
    return { ok: false, error: "ダメージ記録なし" };
  }

  const trimmedName = input.playerName.trim().slice(0, 16) || "名無しの召喚士";
  const isInf = !Number.isFinite(input.maxDamage) && input.maxDamage > 0;
  const numericDamage = isInf
    ? MAX_FINITE_DB_DAMAGE
    : Math.min(MAX_FINITE_DB_DAMAGE, Math.max(0, Math.floor(input.maxDamage)));

  const payload = {
    run_id: input.runId,
    player_name: trimmedName,
    stage_id: input.stageId,
    stage_name: input.stageName.slice(0, 40),
    is_daily: Boolean(input.isDaily),
    daily_date: input.isDaily ? input.dailyDate ?? getTodayJstDateKey() : null,
    cleared: Boolean(input.cleared),
    reached_floor: Math.max(1, Math.min(9999, Math.floor(input.reachedFloor))),
    is_inf: isInf,
    max_damage: numericDamage,
    relic_ids: input.relicIds.slice(0, 100),
  };

  try {
    const res = await fetch(`${cfg.url}/rest/v1/rankings?on_conflict=run_id`, {
      method: "POST",
      headers: buildSupabaseHeaders(cfg.key, {
        Prefer: "return=minimal,resolution=ignore-duplicates",
      }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      if (
        res.status === 400 &&
        (input.stageId === "stage_random" || input.stageId === "stage_impromptu")
      ) {
        return {
          ok: false,
          error: "HTTP 400（Supabase側の特殊迷宮制約マイグレーション未適用）",
        };
      }
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "通信エラー" };
  }
}

export async function submitGenreBestRecords(
  histories: RunHistoryEntry[],
  playerName: string
): Promise<{
  submittedCount: number;
  failedCount: number;
  firstError?: string;
}> {
  const bestByBucket = new Map<string, RunHistoryEntry>();
  for (const h of histories) {
    if (h.maxDamage <= 0) continue;
    const genre = getRunRankingGenre(h);
    const bucketKey =
      genre === "daily"
        ? `daily_${getTodayJstDateKey(new Date(h.createdAt))}`
        : `${genre}_${h.stageId}`;
    const prev = bestByBucket.get(bucketKey);
    if (!prev || h.maxDamage > prev.maxDamage) {
      bestByBucket.set(bucketKey, h);
    }
  }

  const targets = Array.from(bestByBucket.values());
  if (targets.length === 0) {
    return { submittedCount: 0, failedCount: 0 };
  }

  const results = await Promise.all(
    targets.map((h) =>
      submitRankingScore({
        runId: h.id,
        playerName,
        stageId: h.stageId,
        stageName: h.stageName,
        isDaily: h.isDaily,
        dailyDate: h.isDaily ? getTodayJstDateKey(new Date(h.createdAt)) : null,
        cleared: h.cleared,
        reachedFloor: h.reachedFloor,
        maxDamage: h.maxDamage,
        relicIds: h.relicIds,
      })
    )
  );

  let submittedCount = 0;
  let failedCount = 0;
  let firstError: string | undefined;
  for (const r of results) {
    if (r.ok) submittedCount += 1;
    else {
      failedCount += 1;
      if (!firstError && r.error) firstError = r.error;
    }
  }
  return { submittedCount, failedCount, firstError };
}

export async function fetchRankings(options?: {
  genre?: RankingGenre;
  dailyScope?: "today" | "all";
  dailyDate?: string;
  stageId?: string;
  limit?: number;
}): Promise<{ entries: RankingEntry[]; error?: string }> {
  const cfg = getSupabaseConfig();
  if (!cfg) return { entries: [], error: "Supabase未設定" };

  const params = new URLSearchParams({
    select:
      "id,run_id,player_name,stage_id,stage_name,is_daily,daily_date,cleared,reached_floor,is_inf,max_damage,relic_ids,created_at",
    order: "is_inf.desc,max_damage.desc,reached_floor.desc,created_at.asc",
    limit: String(options?.limit ?? 50),
  });

  const genre = options?.genre ?? "all";
  if (genre === "daily") {
    params.append("is_daily", "eq.true");
    if (options?.dailyScope !== "all") {
      params.append("daily_date", `eq.${options?.dailyDate ?? getTodayJstDateKey()}`);
    }
  } else if (genre === "random") {
    params.append("is_daily", "eq.false");
    params.append("stage_id", "eq.stage_random");
  } else if (genre === "impromptu") {
    params.append("is_daily", "eq.false");
    params.append("stage_id", "eq.stage_impromptu");
  } else if (genre === "standard") {
    params.append("is_daily", "eq.false");
    if (options?.stageId && options.stageId !== "all") {
      params.append("stage_id", `eq.${options.stageId}`);
    } else {
      params.append("stage_id", "in.(stage_1,stage_2,stage_3)");
    }
  } else if (options?.stageId && options.stageId !== "all") {
    params.append("stage_id", `eq.${options.stageId}`);
  }

  try {
    const res = await fetch(`${cfg.url}/rest/v1/rankings?${params.toString()}`, {
      method: "GET",
      headers: buildSupabaseHeaders(cfg.key),
      cache: "no-store",
    });
    if (!res.ok) {
      return { entries: [], error: `HTTP ${res.status}` };
    }
    const rows = (await res.json()) as RawRankingRow[];
    const entries: RankingEntry[] = rows.map((row) => ({
      id: row.id,
      runId: row.run_id,
      playerName: row.player_name,
      stageId: row.stage_id,
      stageName: row.stage_name,
      isDaily: row.is_daily,
      dailyDate: row.daily_date,
      cleared: row.cleared,
      reachedFloor: row.reached_floor,
      maxDamage: row.is_inf ? Infinity : row.max_damage,
      relicIds: Array.isArray(row.relic_ids) ? row.relic_ids : [],
      createdAt: row.created_at,
    }));
    return { entries };
  } catch {
    return { entries: [], error: "通信エラー" };
  }
}
