"use client";

import {
  getWordMaster,
  INITIAL_POOL_TERMS,
  THEME_PACKS,
} from "@/data/words";
import { evaluateKanjiDifficulty } from "@/data/kanjiLevels";
import { createProceduralCard, type MinedCardResult } from "@/lib/analyzer";
import type { RunState } from "@/lib/battleEngine";
import { hashStringToSeed } from "@/lib/bignum";
import { getRunRankingBucketKey } from "@/lib/rankings";
import {
  formatSkillDescription,
  type DeckPreset,
  type OwnedWord,
  type PlayerSaveData,
  type RunHistoryEntry,
} from "@/types/game";

export const STORAGE_KEY = "goi_shokan_save_v1";
const ACTIVE_RUN_STORAGE_KEY = "goi_shokan_active_run_v1";

function serializeWithInfinity(value: unknown): string {
  return JSON.stringify(value, (_key, val) => (val === Infinity ? "__INF__" : val));
}

function parseWithInfinity<T>(raw: string): T {
  return JSON.parse(raw, (_key, val) => (val === "__INF__" ? Infinity : val)) as T;
}

function buildDefaultOwnedWords(): Record<string, OwnedWord> {
  const map: Record<string, OwnedWord> = {};
  const now = "2026-01-01T00:00:00.000Z";
  for (const term of INITIAL_POOL_TERMS) {
    const master = getWordMaster(term);
    if (!master) continue;
    map[term] = {
      ...master,
      obtainCount: 1,
      firstSnippet: "初期支給の言霊",
      firstDiscoveredAt: now,
    };
  }
  return map;
}

export function createInitialSaveData(): PlayerSaveData {
  return {
    guestName: "名無しの召喚士",
    ownedWords: buildDefaultOwnedWords(),
    deckPoolTerms: [...INITIAL_POOL_TERMS],
    aceTerm: "示唆",
    deckPresets: [],
    activePresetId: null,
    unlockedAchievements: [],
    clearedStages: [],
    discoveredRelics: [],
    encounteredEnemies: [],
    runHistories: [],
    bestRunRecords: {},
    bestDamage: 0,
    totalSummons: 0,
    recentTextHashes: [],
    tutorialDismissed: false,
  };
}

function hasValidCardStats(word: Partial<OwnedWord>): boolean {
  return (
    typeof word.rank === "string" &&
    typeof word.attribute === "string" &&
    typeof word.cost === "number" &&
    Number.isFinite(word.cost) &&
    typeof word.baseAtk === "number" &&
    Number.isFinite(word.baseAtk) &&
    typeof word.baseDef === "number" &&
    Number.isFinite(word.baseDef) &&
    typeof word.skillType === "string" &&
    typeof word.skillPower === "number" &&
    Number.isFinite(word.skillPower)
  );
}

function clampOwnedWords(
  owned: Record<string, OwnedWord>
): Record<string, OwnedWord> {
  const result: Record<string, OwnedWord> = {};
  for (const [key, word] of Object.entries(owned)) {
    const master = getWordMaster(key);
    let synced = master ? { ...word, ...master } : { ...word };
    if (!master && synced.rank !== "F" && !hasValidCardStats(synced)) {
      const kDiff = evaluateKanjiDifficulty(synced.term);
      const inferredWordType =
        synced.rank === "UR" &&
        /^[\u4e00-\u9faf]+$/.test(synced.term) &&
        (kDiff.nonJoyoCount >= 2 ||
          kDiff.kanjiCount >= 4 ||
          (kDiff.nonJoyoCount === 1 && kDiff.kanjiCount >= 2))
          ? "UNKNOWN"
          : "KNOWN";
      synced = {
        ...synced,
        ...createProceduralCard(
          synced.term,
          synced.reading,
          synced.pos,
          "",
          inferredWordType
        ),
      };
    }
    // Migrate any legacy square_mult saved in localStorage
    const wasLegacySquare = (synced.skillType as string) === "square_mult";
    if (wasLegacySquare) {
      synced.skillType = "mult_next";
      synced.skillPower = 2.2;
    }
    if (master || synced.rank !== "F" || !synced.skillDesc || wasLegacySquare) {
      synced.skillDesc = formatSkillDescription(
        synced.skillType,
        synced.skillPower,
        synced.subSkill
      );
    }
    result[key] = {
      ...synced,
      obtainCount: Math.max(1, word.obtainCount),
    };
  }
  return result;
}

function isBetterRunRecord(next: RunHistoryEntry, prev: RunHistoryEntry): boolean {
  if (next.maxDamage !== prev.maxDamage) return next.maxDamage > prev.maxDamage;
  if (next.reachedFloor !== prev.reachedFloor) {
    return next.reachedFloor > prev.reachedFloor;
  }
  return Boolean(next.cleared) && !prev.cleared;
}

function mergeBestRunRecords(
  existing: Record<string, RunHistoryEntry>,
  entries: RunHistoryEntry[]
): Record<string, RunHistoryEntry> {
  const map: Record<string, RunHistoryEntry> = { ...existing };
  for (const entry of entries) {
    if (!entry || entry.maxDamage <= 0) continue;
    const key = getRunRankingBucketKey(entry);
    const prev = map[key];
    if (!prev || isBetterRunRecord(entry, prev)) {
      map[key] = entry;
    }
  }
  // Keep all non-daily buckets and at most the latest 30 daily buckets
  const dailyKeys = Object.keys(map)
    .filter((k) => k.startsWith("daily_"))
    .sort()
    .reverse();
  for (const oldKey of dailyKeys.slice(30)) {
    delete map[oldKey];
  }
  return map;
}

export function loadSaveData(): PlayerSaveData {
  if (typeof window === "undefined") return createInitialSaveData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialSaveData();
      window.localStorage.setItem(STORAGE_KEY, serializeWithInfinity(initial));
      return initial;
    }
    const parsed = parseWithInfinity<Partial<PlayerSaveData>>(raw);
    const defaults = createInitialSaveData();
    const safeHistories = Array.isArray(parsed.runHistories)
      ? parsed.runHistories.map((h) => ({
          ...h,
          maxDamage: typeof h.maxDamage === "number" ? h.maxDamage : 0,
        }))
      : defaults.runHistories;
    const ownedWords = clampOwnedWords({
      ...defaults.ownedWords,
      ...(parsed.ownedWords ?? {}),
    });
    const safePresets = Array.isArray(parsed.deckPresets)
      ? parsed.deckPresets
          .filter(
            (p): p is DeckPreset =>
              Boolean(p && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.deckPoolTerms))
          )
          .slice(0, 8)
          .map((p) => {
            const validPool = Array.from(
              new Set(p.deckPoolTerms.filter((t) => Boolean(ownedWords[t])))
            ).slice(0, 30);
            const paddedPool =
              validPool.length >= 6
                ? validPool
                : Array.from(new Set([...validPool, ...INITIAL_POOL_TERMS])).slice(0, 30);
            const validAce =
              p.aceTerm && ownedWords[p.aceTerm] ? p.aceTerm : paddedPool[0];
            return {
              ...p,
              name: p.name.trim().slice(0, 20) || "プリセット",
              deckPoolTerms: paddedPool,
              aceTerm: validAce,
            };
          })
      : [];
    const safeActivePresetId =
      parsed.activePresetId && safePresets.some((p) => p.id === parsed.activePresetId)
        ? parsed.activePresetId
        : null;

    const rawPool = Array.isArray(parsed.deckPoolTerms) ? parsed.deckPoolTerms : [];
    const filteredPool = Array.from(
      new Set(rawPool.filter((t) => Boolean(ownedWords[t])))
    ).slice(0, 30);
    const validPool =
      filteredPool.length >= 6
        ? filteredPool
        : Array.from(
            new Set([
              ...filteredPool,
              ...INITIAL_POOL_TERMS.filter((t) => Boolean(ownedWords[t])),
              ...Object.keys(ownedWords),
            ])
          ).slice(0, Math.max(6, filteredPool.length));
    const validAceTerm =
      parsed.aceTerm && ownedWords[parsed.aceTerm]
        ? parsed.aceTerm
        : validPool[0] ?? defaults.aceTerm;

    const existingBestMap =
      parsed.bestRunRecords && typeof parsed.bestRunRecords === "object"
        ? parsed.bestRunRecords
        : {};
    const mergedBestRecords = mergeBestRunRecords(existingBestMap, safeHistories);

    const merged: PlayerSaveData = {
      ...defaults,
      ...parsed,
      bestDamage: typeof parsed.bestDamage === "number" ? parsed.bestDamage : 0,
      runHistories: safeHistories,
      bestRunRecords: mergedBestRecords,
      ownedWords,
      deckPoolTerms: validPool,
      aceTerm: validAceTerm,
      deckPresets: safePresets,
      activePresetId: safeActivePresetId,
      recentTextHashes: parsed.recentTextHashes ?? [],
    };
    merged.unlockedAchievements = checkCollectionAchievements(merged);
    return merged;
  } catch {
    return createInitialSaveData();
  }
}

export function saveSaveData(data: PlayerSaveData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeWithInfinity(data));
  } catch {
    // Ignore storage quota issues safely
  }
}

export function saveActiveRunState(run: RunState | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!run) {
      window.localStorage.removeItem(ACTIVE_RUN_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        ACTIVE_RUN_STORAGE_KEY,
        serializeWithInfinity(run)
      );
    }
  } catch {
    // Ignore storage quota issues safely
  }
}

export function loadActiveRunState(): RunState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseWithInfinity<Partial<RunState>>(raw);
    if (
      !parsed ||
      typeof parsed.runId !== "string" ||
      typeof parsed.stageId !== "string" ||
      !Array.isArray(parsed.deck) ||
      !parsed.enemy
    ) {
      return null;
    }
    return parsed as RunState;
  } catch {
    return null;
  }
}

export function checkCollectionAchievements(data: PlayerSaveData): string[] {
  const unlocked = new Set(data.unlockedAchievements);
  const ownedCount = Object.keys(data.ownedWords).length;
  const urCount = Object.values(data.ownedWords).filter(
    (w) => w.rank === "UR"
  ).length;

  // Collection & excavation milestones
  if (data.totalSummons >= 1) unlocked.add("first_summon");
  if (data.totalSummons >= 10) unlocked.add("summon_10");
  if (data.totalSummons >= 30) unlocked.add("summon_30");
  if (ownedCount >= 30) unlocked.add("collect_30");
  if (ownedCount >= 60) unlocked.add("collect_60");
  if (ownedCount >= 100) unlocked.add("collect_100");
  if (ownedCount >= 150) unlocked.add("collect_150");
  if (urCount >= 1) unlocked.add("discover_ur");
  if (urCount >= 5) unlocked.add("discover_ur_5");

  const completedPacks = THEME_PACKS.filter((pack) =>
    pack.terms.every((t) => Boolean(data.ownedWords[t]))
  ).length;
  if (completedPacks >= 1) unlocked.add("pack_complete");
  if (completedPacks >= 3) unlocked.add("pack_complete_3");

  // Relic discovery milestones
  const relicCount = data.discoveredRelics.length;
  if (relicCount >= 15) unlocked.add("relic_15");
  if (relicCount >= 40) unlocked.add("relic_40");
  if (relicCount >= 70) unlocked.add("relic_all_70");

  // Output milestones (backfill from bestDamage)
  if (data.bestDamage >= 10_000) unlocked.add("dmg_man");
  if (data.bestDamage >= 100_000_000) unlocked.add("dmg_oku");
  if (data.bestDamage >= 1_000_000_000_000) unlocked.add("dmg_cho");
  if (data.bestDamage >= 1e16) unlocked.add("dmg_kei");
  if (data.bestDamage >= 1e20) unlocked.add("dmg_gai");
  if (data.bestDamage >= 1e68) unlocked.add("dmg_muryo");

  // Stage & Endless milestones (backfill from clearedStages & runHistories)
  if (data.clearedStages.includes("stage_1")) unlocked.add("clear_stage_1");
  if (data.clearedStages.includes("stage_2")) unlocked.add("clear_stage_2");
  if (data.clearedStages.includes("stage_3")) unlocked.add("clear_stage_3");
  if (data.clearedStages.includes("stage_random")) unlocked.add("clear_random");
  if (data.clearedStages.includes("stage_impromptu")) {
    unlocked.add("clear_impromptu");
  }

  for (const h of data.runHistories) {
    if (h.cleared && h.isDaily) unlocked.add("daily_clear");
    if (h.reachedFloor >= 20) unlocked.add("endless_20");
    if (h.reachedFloor >= 50) unlocked.add("endless_50");
    if (h.reachedFloor >= 100) unlocked.add("endless_100");
    if (h.relicIds.some((id) => id.startsWith("white_revelation"))) {
      unlocked.add("white_revelation");
    }
    if (h.relicIds.some((id) => id.startsWith("black_pact_"))) {
      unlocked.add("black_covenant");
    }
  }

  return Array.from(unlocked);
}

export function getTextSignature(text: string): string {
  const normalized = text.replace(/\s+/g, "").trim();
  return `${normalized.length}_${hashStringToSeed(normalized)}`;
}

export function applyMiningPackToSave(
  current: PlayerSaveData,
  pack: MinedCardResult[],
  rawText: string,
  options?: { registerNewOnlyOnDuplicate?: boolean }
): {
  next: PlayerSaveData;
  newTerms: string[];
  upgradedTerms: string[];
  isDuplicateText: boolean;
} {
  const sig = getTextSignature(rawText);
  const recent = current.recentTextHashes ?? [];
  const now = new Date().toISOString();

  if (recent.includes(sig)) {
    if (options?.registerNewOnlyOnDuplicate) {
      const nextOwned = { ...current.ownedWords };
      const newTerms: string[] = [];
      for (const item of pack) {
        const term = item.entry.term;
        if (!nextOwned[term]) {
          nextOwned[term] = {
            ...item.entry,
            obtainCount: 1,
            firstSnippet: item.snippet,
            firstDiscoveredAt: now,
            isUnknownGenerated: item.isUnknownGenerated,
          };
          newTerms.push(term);
        }
      }
      if (newTerms.length > 0) {
        const updated: PlayerSaveData = {
          ...current,
          ownedWords: nextOwned,
        };
        updated.unlockedAchievements = checkCollectionAchievements(updated);
        saveSaveData(updated);
        return {
          next: updated,
          newTerms,
          upgradedTerms: [],
          isDuplicateText: true,
        };
      }
    }
    return {
      next: current,
      newTerms: [],
      upgradedTerms: [],
      isDuplicateText: true,
    };
  }

  const nextOwned = { ...current.ownedWords };
  const newTerms: string[] = [];
  const upgradedTerms: string[] = [];

  for (const item of pack) {
    const term = item.entry.term;
    const prev = nextOwned[term];
    if (prev) {
      const nextCount = prev.obtainCount + 1;
      upgradedTerms.push(term);
      nextOwned[term] = item.isRepeatedPenalty
        ? {
            ...prev,
            obtainCount: nextCount,
          }
        : {
            ...prev,
            ...item.entry,
            obtainCount: nextCount,
            firstSnippet: prev.firstSnippet,
            firstDiscoveredAt: prev.firstDiscoveredAt,
            isUnknownGenerated: item.isUnknownGenerated,
          };
    } else {
      nextOwned[term] = {
        ...item.entry,
        obtainCount: 1,
        firstSnippet: item.snippet,
        firstDiscoveredAt: now,
        isUnknownGenerated: item.isUnknownGenerated,
      };
      newTerms.push(term);
    }
  }

  const updated: PlayerSaveData = {
    ...current,
    ownedWords: nextOwned,
    totalSummons: current.totalSummons + 1,
    recentTextHashes: [sig, ...recent].slice(0, 5),
  };
  updated.unlockedAchievements = checkCollectionAchievements(updated);
  saveSaveData(updated);
  return { next: updated, newTerms, upgradedTerms, isDuplicateText: false };
}

export function updateDeckPoolInSave(
  current: PlayerSaveData,
  deckPoolTerms: string[],
  aceTerm: string
): PlayerSaveData {
  const next: PlayerSaveData = {
    ...current,
    deckPoolTerms: deckPoolTerms.slice(0, 30),
    aceTerm,
  };
  saveSaveData(next);
  return next;
}

export const MAX_DECK_PRESETS = 8;

export function isPresetSyncedWithSave(
  save: PlayerSaveData,
  preset: DeckPreset
): boolean {
  if (preset.aceTerm !== save.aceTerm) return false;
  if (preset.deckPoolTerms.length !== save.deckPoolTerms.length) return false;
  const setA = new Set(save.deckPoolTerms);
  return preset.deckPoolTerms.every((t) => setA.has(t));
}

export function saveDeckPresetInSave(
  current: PlayerSaveData,
  params: { id?: string; name?: string }
): PlayerSaveData {
  const existing = current.deckPresets ?? [];
  const pool = current.deckPoolTerms.slice(0, 30);
  const ace = current.aceTerm;
  const now = new Date().toISOString();

  if (params.id) {
    const updatedPresets = existing.map((p) =>
      p.id === params.id
        ? {
            ...p,
            name: params.name?.trim().slice(0, 20) || p.name,
            deckPoolTerms: pool,
            aceTerm: ace,
            updatedAt: now,
          }
        : p
    );
    const next: PlayerSaveData = {
      ...current,
      deckPresets: updatedPresets,
      activePresetId: params.id,
    };
    saveSaveData(next);
    return next;
  }

  if (existing.length >= MAX_DECK_PRESETS) return current;
  const newId = `preset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const fallbackName = `プリセット ${existing.length + 1}`;
  const newPreset: DeckPreset = {
    id: newId,
    name: params.name?.trim().slice(0, 20) || fallbackName,
    deckPoolTerms: pool,
    aceTerm: ace,
    updatedAt: now,
  };
  const next: PlayerSaveData = {
    ...current,
    deckPresets: [...existing, newPreset],
    activePresetId: newId,
  };
  saveSaveData(next);
  return next;
}

export function applyDeckPresetInSave(
  current: PlayerSaveData,
  presetId: string
): PlayerSaveData {
  const preset = (current.deckPresets ?? []).find((p) => p.id === presetId);
  if (!preset) return current;
  const validPool = preset.deckPoolTerms.filter((t) => Boolean(current.ownedWords[t]));
  const finalPool =
    validPool.length >= 6
      ? validPool.slice(0, 30)
      : Array.from(new Set([...validPool, ...current.deckPoolTerms])).slice(0, 30);
  const finalAce =
    current.ownedWords[preset.aceTerm] && finalPool.includes(preset.aceTerm)
      ? preset.aceTerm
      : finalPool[0] ?? current.aceTerm;

  const next: PlayerSaveData = {
    ...current,
    deckPoolTerms: finalPool,
    aceTerm: finalAce,
    activePresetId: preset.id,
  };
  saveSaveData(next);
  return next;
}

export function deleteDeckPresetInSave(
  current: PlayerSaveData,
  presetId: string
): PlayerSaveData {
  const remaining = (current.deckPresets ?? []).filter((p) => p.id !== presetId);
  const next: PlayerSaveData = {
    ...current,
    deckPresets: remaining,
    activePresetId: current.activePresetId === presetId ? null : current.activePresetId,
  };
  saveSaveData(next);
  return next;
}

export function recordRunResultInSave(
  current: PlayerSaveData,
  params: {
    history: RunHistoryEntry;
    discoveredRelics: string[];
    encounteredEnemies: string[];
    hadWhiteRevelation: boolean;
    hadBlackCovenant?: boolean;
    hadFCardInDeck: boolean;
    englishCardCount?: number;
    deckSize?: number;
  }
): PlayerSaveData {
  const unlocked = new Set(current.unlockedAchievements);
  const {
    history,
    hadWhiteRevelation,
    hadBlackCovenant = false,
    hadFCardInDeck,
    englishCardCount = 0,
    deckSize = 99,
  } = params;

  if (history.maxDamage >= 10_000) unlocked.add("dmg_man");
  if (history.maxDamage >= 100_000_000) unlocked.add("dmg_oku");
  if (history.maxDamage >= 1_000_000_000_000) unlocked.add("dmg_cho");
  if (history.maxDamage >= 1e16) unlocked.add("dmg_kei");
  if (history.maxDamage >= 1e20) unlocked.add("dmg_gai");
  if (history.maxDamage >= 1e68) unlocked.add("dmg_muryo");
  if (hadWhiteRevelation) unlocked.add("white_revelation");
  if (hadBlackCovenant) unlocked.add("black_covenant");
  if (history.cleared && history.stageId === "stage_1") unlocked.add("clear_stage_1");
  if (history.cleared && history.stageId === "stage_2") unlocked.add("clear_stage_2");
  if (history.cleared && history.stageId === "stage_3") unlocked.add("clear_stage_3");
  if (history.cleared && history.stageId === "stage_random") {
    unlocked.add("clear_random");
  }
  if (history.cleared && history.stageId === "stage_impromptu") {
    unlocked.add("clear_impromptu");
  }
  if (history.cleared && history.isDaily) unlocked.add("daily_clear");
  if (history.reachedFloor >= 20) unlocked.add("endless_20");
  if (history.reachedFloor >= 50) unlocked.add("endless_50");
  if (history.reachedFloor >= 100) unlocked.add("endless_100");
  if (history.cleared && hadFCardInDeck) unlocked.add("f_build_win");
  if (history.cleared && englishCardCount >= 3) unlocked.add("english_deck_win");
  if (history.cleared && deckSize <= 8) unlocked.add("minimalist_win");

  const clearedStages = history.cleared
    ? Array.from(new Set([...current.clearedStages, history.stageId]))
    : current.clearedStages;

  const next: PlayerSaveData = {
    ...current,
    clearedStages,
    discoveredRelics: Array.from(
      new Set([...current.discoveredRelics, ...params.discoveredRelics])
    ),
    encounteredEnemies: Array.from(
      new Set([...current.encounteredEnemies, ...params.encounteredEnemies])
    ),
    runHistories: [
      history,
      ...current.runHistories.filter((h) => h.id !== history.id),
    ].slice(0, 30),
    bestRunRecords: mergeBestRunRecords(
      current.bestRunRecords ?? {},
      [history]
    ),
    bestDamage: Math.max(current.bestDamage, history.maxDamage),
    unlockedAchievements: Array.from(unlocked),
  };

  next.unlockedAchievements = checkCollectionAchievements(next);
  saveSaveData(next);
  return next;
}

export function resetAllSaveData(): PlayerSaveData {
  const fresh = createInitialSaveData();
  saveSaveData(fresh);
  saveActiveRunState(null);
  return fresh;
}
