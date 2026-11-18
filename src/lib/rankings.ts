"use client";

import { getTodayJstDateKey } from "@/lib/bignum";

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
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "通信エラー" };
  }
}

export async function fetchRankings(options?: {
  mode?: "overall" | "daily";
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

  if (options?.mode === "daily") {
    params.append("is_daily", "eq.true");
    params.append("daily_date", `eq.${options.dailyDate ?? getTodayJstDateKey()}`);
  }
  if (options?.stageId && options.stageId !== "all") {
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
