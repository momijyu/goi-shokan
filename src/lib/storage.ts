"use client";

import {
  getWordMaster,
  INITIAL_POOL_TERMS,
  THEME_PACKS,
} from "@/data/words";
import { evaluateKanjiDifficulty } from "@/data/kanjiLevels";
import { createProceduralCard, type MinedCardResult } from "@/lib/analyzer";
import { hashStringToSeed } from "@/lib/bignum";
import {
  formatSkillDescription,
  type DeckPreset,
  type OwnedWord,
  type PlayerSaveData,
  type RunHistoryEntry,
} from "@/types/game";

const STORAGE_KEY = "goi_shokan_save_v1";

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
    bestDamage: 0,
    totalSummons: 0,
    recentTextHashes: [],
    tutorialDismissed: false,
  };
}

function clampOwnedWords(
  owned: Record<string, OwnedWord>
): Record<string, OwnedWord> {
  const result: Record<string, OwnedWord> = {};
  for (const [key, word] of Object.entries(owned)) {
    const master = getWordMaster(key);
    let synced = master ? { ...word, ...master } : { ...word };
    if (!master && synced.rank !== "F") {
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
    if ((synced.skillType as string) === "square_mult") {
      synced.skillType = "mult_next";
      synced.skillPower = 2.2;
    }
    synced.skillDesc = formatSkillDescription(
      synced.skillType,
      synced.skillPower,
      synced.subSkill
    );
    result[key] = {
      ...synced,
      obtainCount: Math.max(1, word.obtainCount),
    };
  }
  return result;
}

export function loadSaveData(): PlayerSaveData {
  if (typeof window === "undefined") return createInitialSaveData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialSaveData();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw, (_key, value) =>
      value === "__INF__" ? Infinity : value
    ) as Partial<PlayerSaveData>;
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

    return {
      ...defaults,
      ...parsed,
      bestDamage: typeof parsed.bestDamage === "number" ? parsed.bestDamage : 0,
      runHistories: safeHistories,
      ownedWords,
      deckPoolTerms:
        parsed.deckPoolTerms && parsed.deckPoolTerms.length >= 6
          ? parsed.deckPoolTerms
          : defaults.deckPoolTerms,
      deckPresets: safePresets,
      activePresetId: safeActivePresetId,
      recentTextHashes: parsed.recentTextHashes ?? [],
    };
  } catch {
    return createInitialSaveData();
  }
}

export function saveSaveData(data: PlayerSaveData): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(data, (_key, value) =>
      value === Infinity ? "__INF__" : value
    );
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Ignore storage quota issues safely
  }
}

export function checkCollectionAchievements(data: PlayerSaveData): string[] {
  const unlocked = new Set(data.unlockedAchievements);
  const ownedCount = Object.keys(data.ownedWords).length;

  if (data.totalSummons >= 1) unlocked.add("first_summon");
  if (ownedCount >= 30) unlocked.add("collect_30");
  if (ownedCount >= 60) unlocked.add("collect_60");

  const hasUR = Object.values(data.ownedWords).some((w) => w.rank === "UR");
  if (hasUR) unlocked.add("discover_ur");

  for (const pack of THEME_PACKS) {
    if (pack.terms.every((t) => Boolean(data.ownedWords[t]))) {
      unlocked.add("pack_complete");
      break;
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
  rawText: string
): {
  next: PlayerSaveData;
  newTerms: string[];
  upgradedTerms: string[];
  isDuplicateText: boolean;
} {
  const sig = getTextSignature(rawText);
  const recent = current.recentTextHashes ?? [];
  if (recent.includes(sig)) {
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
  const now = "2026-01-01T00:00:00.000Z";

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
    hadFCardInDeck: boolean;
  }
): PlayerSaveData {
  const unlocked = new Set(current.unlockedAchievements);
  const { history, hadWhiteRevelation, hadFCardInDeck } = params;

  if (history.maxDamage >= 10_000) unlocked.add("dmg_man");
  if (history.maxDamage >= 100_000_000) unlocked.add("dmg_oku");
  if (history.maxDamage >= 1_000_000_000_000) unlocked.add("dmg_cho");
  if (hadWhiteRevelation) unlocked.add("white_revelation");
  if (history.cleared && history.stageId === "stage_1") unlocked.add("clear_stage_1");
  if (history.cleared && history.stageId === "stage_3") unlocked.add("clear_stage_3");
  if (history.cleared && hadFCardInDeck) unlocked.add("f_build_win");

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
    runHistories: [history, ...current.runHistories].slice(0, 30),
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
  return fresh;
}
