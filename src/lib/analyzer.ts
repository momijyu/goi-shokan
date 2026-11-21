"use client";

import { evaluateKanjiDifficulty } from "@/data/kanjiLevels";
import { getWordMaster, WORD_MASTER_LIST } from "@/data/words";
import { hashStringToSeed } from "@/lib/bignum";
import { getDictBaseUrl, getDictFileUrl } from "@/lib/dictConfig";
import { fetchPossiblyGzippedText } from "@/lib/wordDefinitions";
import {
  formatSkillDescription,
  type Attribute,
  type PosCategory,
  type Rank,
  type SkillType,
  type WordMasterEntry,
} from "@/types/game";

interface KuromojiToken {
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  basic_form: string;
  reading?: string;
  word_type: "KNOWN" | "UNKNOWN";
}

interface SudachiLexEntry {
  pos: PosCategory;
  tier: number; // 0 (common) .. 3 (rare)
  reading: string;
}

interface KuromojiTokenizer {
  tokenize: (text: string) => KuromojiToken[];
}

interface KuromojiGlobal {
  builder: (opts: { dicPath: string }) => {
    build: (cb: (err: Error | null, tokenizer: KuromojiTokenizer) => void) => void;
  };
}

let tokenizerPromise: Promise<KuromojiTokenizer> | null = null;

function loadKuromojiScript(): Promise<KuromojiGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Analyzer can only run in browser"));
  }
  const win = window as unknown as { kuromoji?: KuromojiGlobal };
  if (win.kuromoji) {
    return Promise.resolve(win.kuromoji);
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-kuromoji="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (win.kuromoji) resolve(win.kuromoji);
        else reject(new Error("kuromoji global missing after load"));
      });
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load kuromoji script"))
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "/vendor/kuromoji.js";
    script.async = true;
    script.dataset.kuromoji = "true";
    script.onload = () => {
      if (win.kuromoji) resolve(win.kuromoji);
      else reject(new Error("kuromoji global not found"));
    };
    script.onerror = () => reject(new Error("Failed to load /vendor/kuromoji.js"));
    document.head.appendChild(script);
  });
}

export async function getTokenizer(): Promise<KuromojiTokenizer> {
  if (!tokenizerPromise) {
    tokenizerPromise = loadKuromojiScript().then(
      (kuromoji) =>
        new Promise<KuromojiTokenizer>((resolve, reject) => {
          kuromoji.builder({ dicPath: getDictBaseUrl() }).build((err, tokenizer) => {
            if (err) {
              tokenizerPromise = null;
              reject(err);
            } else {
              resolve(tokenizer);
            }
          });
        })
    );
  }
  return tokenizerPromise;
}

const SUDACHI_POS_MAP: Record<string, PosCategory> = {
  n: "noun",
  v: "verb",
  a: "adj",
  d: "adv",
  c: "conj",
  o: "other",
};

let sudachiPromise: Promise<Map<string, SudachiLexEntry>> | null = null;

export async function getSudachiLexicon(): Promise<Map<string, SudachiLexEntry>> {
  if (typeof window === "undefined") {
    return new Map();
  }
  if (!sudachiPromise) {
    sudachiPromise = fetchPossiblyGzippedText(getDictFileUrl("sudachi_lex.tsv.gz"))
      .then((text) => {
        const map = new Map<string, SudachiLexEntry>();
        if (!text) return map;
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line || line.startsWith("#")) continue;
          const t1 = line.indexOf("\t");
          if (t1 === -1) continue;
          const t2 = line.indexOf("\t", t1 + 1);
          if (t2 === -1) continue;
          const t3 = line.indexOf("\t", t2 + 1);
          if (t3 === -1) continue;
          const term = line.slice(0, t1);
          const posCode = line.slice(t1 + 1, t2);
          const tier = Number(line.slice(t2 + 1, t3)) || 0;
          const reading = line.slice(t3 + 1) || term;
          map.set(term, {
            pos: SUDACHI_POS_MAP[posCode] ?? "noun",
            tier,
            reading,
          });
        }
        return map;
      })
      .catch(() => new Map<string, SudachiLexEntry>());
  }
  return sudachiPromise;
}

function mapPos(pos: string): PosCategory {
  switch (pos) {
    case "名詞":
      return "noun";
    case "動詞":
      return "verb";
    case "形容詞":
      return "adj";
    case "副詞":
      return "adv";
    case "接続詞":
      return "conj";
    default:
      return "other";
  }
}

function katakanaToHiragana(src: string): string {
  return src.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/** Check if unknown token is plausible new/coined word vs gibberish */
function isPlausibleUnknownWord(term: string): boolean {
  if (term.length < 2 || term.length > 14) return false;
  // Pure hiragana unknown strings or repeated single character (e.g., ああああ) -> noise (F)
  if (/^(.)\1+$/.test(term)) return false;
  if (/^[ぁ-んー]+$/.test(term)) return false;
  // Must contain Kanji, Katakana, or meaningful ASCII word
  const hasKanji = /[\u4e00-\u9faf]/.test(term);
  const hasKatakana = /[\u30a1-\u30f6]/.test(term) && term.length >= 3;
  const isCleanAscii =
    /^[A-Za-z][A-Za-z0-9-]{2,13}$/.test(term) ||
    /^(AI|VR|AR|HP|MP|UI|UX|OS|DB|API)$/.test(term);
  return hasKanji || hasKatakana || isCleanAscii;
}

const BASIC_ENGLISH_WORDS = new Set([
  "time", "word", "life", "work", "good", "bad", "love", "like", "make", "take",
  "give", "test", "game", "play", "code", "data", "user", "page", "book", "name",
  "hand", "head", "mind", "heart", "fire", "wind", "rain", "star", "moon", "sun",
  "light", "dark", "hope", "fear", "way", "day", "night", "home", "world", "man",
  "woman", "child", "food", "water", "card", "deck", "run", "walk", "talk", "read",
  "write", "look", "see", "think", "know", "feel", "want", "need", "help", "move",
  "stop", "start", "open", "close", "high", "low", "new", "old", "big", "small",
  "fast", "slow", "true", "false", "one", "two", "three", "yes", "not", "red",
  "blue", "black", "white", "green", "gold", "cat", "dog", "bird", "tree", "line",
  "text", "file", "list", "item", "part", "form", "note", "plan", "idea", "rule",
  "next", "last", "first", "best", "full", "free", "real", "hard", "easy", "cool",
  "nice", "fine", "happy", "sorry", "thank", "hello", "error", "bug", "fix", "add",
  "apple", "music", "video", "photo", "mail", "chat", "news", "post", "link", "site",
]);

const BASIC_KATAKANA_WORDS = new Set([
  "スマホ", "アプリ", "メール", "チャット", "ネタ", "バグ", "ガチャ", "キャラ",
  "スキル", "ランク", "ルール", "ランチ", "カフェ", "アニメ", "マンガ", "レベル",
  "ゲーム", "テスト", "メモ", "ノート", "ページ", "リンク", "データ", "サーバー",
  "ネット", "ブログ", "カード", "デッキ", "タイム", "ライフ", "ワーク", "ワード",
  "チェック", "ミス", "クリア", "スタート", "ゴール", "バランス", "ポイント",
]);

const RARE_LITERARY_TERMS = new Set([
  "齟齬", "瓦解", "跋扈", "煉獄", "虚無", "彼岸", "刹那", "蒼穹", "慟哭", "畏敬",
  "矜持", "乖離", "蓋然", "網羅", "演繹", "螺旋", "翠玉", "混沌", "深淵", "涅槃",
  "謳歌", "邂逅", "贖罪", "傀儡", "燐光", "蜃気楼", "赫奕", "憧憬", "焦燥", "渇望",
  "閃光", "残響", "漆黒", "灼熱", "清冽", "黎明", "黄昏", "幽玄", "蒼茫", "晦冥",
  "霹靂", "宿命", "輪廻", "劫火", "終焉", "万象", "森羅", "覇道", "蒼天", "孤高",
]);

const ATTRS: Attribute[] = ["logic", "emotion", "sense", "matter"];

function isEnglishWord(term: string): boolean {
  return /^[A-Za-z][A-Za-z0-9-]*$/.test(term);
}

/** Deterministic UR generation balanced by cost tier (identical across all players) */
export function createDeterministicUR(term: string, pos: PosCategory): WordMasterEntry {
  const seed = hashStringToSeed(term.toLowerCase());
  const attribute = inferFallbackAttribute(term, pos, "");
  const cost = 1 + ((seed >>> 3) % 3); // Cost 1, 2, or 3
  const isEng = isEnglishWord(term);

  // Scale base stats & skill power strictly by cost so low-cost URs are never broken
  const atkRanges: Record<number, [number, number]> = {
    1: [28, 15], // 28..42
    2: [58, 25], // 58..82
    3: [95, 40], // 95..134
  };
  const defRanges: Record<number, [number, number]> = {
    1: [24, 15], // 24..38
    2: [48, 25], // 48..72
    3: [75, 35], // 75..109
  };
  const [atkMin, atkSpan] = atkRanges[cost];
  const [defMin, defSpan] = defRanges[cost];
  const baseAtk = atkMin + ((seed >>> 5) % atkSpan);
  const baseDef = defMin + ((seed >>> 11) % defSpan);

  const skillByCost: Record<number, { type: SkillType; power: number }[]> = isEng
    ? {
        1: [
          { type: "english_link", power: 0.8 },
          { type: "english_discount", power: 60 },
          { type: "english_purge", power: 1.45 },
        ],
        2: [
          { type: "english_link", power: 1.4 },
          { type: "english_discount", power: 120 },
          { type: "english_purge", power: 1.85 },
        ],
        3: [
          { type: "english_link", power: 2.2 },
          { type: "english_discount", power: 220 },
          { type: "english_purge", power: 2.4 },
        ],
      }
    : {
        1: [
          { type: "retrigger_next", power: 1 },
          { type: "mult_next", power: 1.6 },
          { type: "mult_battle", power: 1.35 },
          { type: "pierce_burst", power: 1.4 },
        ],
        2: [
          { type: "retrigger_next", power: 1 },
          { type: "mult_next", power: 2.2 },
          { type: "mult_battle", power: 1.85 },
          { type: "pierce_burst", power: 1.8 },
        ],
        3: [
          { type: "retrigger_next", power: 2 },
          { type: "mult_next", power: 3.2 },
          { type: "mult_battle", power: 2.6 },
          { type: "pierce_burst", power: 2.4 },
        ],
      };
  const pool = skillByCost[cost];
  const skill = pool[(seed >>> 17) % pool.length];

  return {
    term,
    reading: term,
    pos,
    rank: "UR",
    attribute,
    cost,
    baseAtk,
    baseDef,
    skillType: skill.type,
    skillPower: skill.power,
    skillDesc: formatSkillDescription(skill.type, skill.power),
  };
}

/** Heuristic Japanese + English attribute classification so procedural cards feel intuitive */
function inferFallbackAttribute(
  term: string,
  pos: PosCategory,
  posDetail1: string
): Attribute {
  const lower = term.toLowerCase();
  if (
    /^(love|hate|happy|sad|angry|fear|hope|dream|heart|soul|cry|joy|rage|pride|grief|sorrow|desire|passion)$/.test(
      lower
    ) ||
    /[喜怒哀楽愛憎怖愁嘆恋夢希望幸悲嬉苦痛涙笑泣怒怖安寂慎誇鬱愁]/.test(term)
  ) {
    return "emotion";
  }
  if (
    /^(light|dark|fire|ice|wind|sound|color|flash|glow|shadow|echo|mist|storm|blaze|frost|mirage|void)$/.test(
      lower
    ) ||
    /[光音色香風雨雪雷声響影閃夜朝春秋冬夏冷熱甘辛酸苦痛明暗静騒速早遅美鮮闇蒼]/.test(
      term
    )
  ) {
    return "sense";
  }
  if (
    /^(logic|code|data|rule|system|reason|proof|true|false|law|theory|paradox|axis|matrix|node|algo)/.test(
      lower
    ) ||
    pos === "conj" ||
    posDetail1 === "サ変接続" ||
    /[性論法理度化的観式系策案構説証判断思考知決律]/.test(term)
  ) {
    return "logic";
  }
  if (pos === "adj") return "emotion";
  if (pos === "adv") return "sense";
  if (pos === "verb") return "matter";
  return ATTRS[hashStringToSeed(lower) % ATTRS.length];
}

function rollProceduralRank(
  term: string,
  wordType: "KNOWN" | "UNKNOWN",
  seed: number,
  sudachiEntry?: SudachiLexEntry
): Rank {
  const roll = seed % 100;
  const lower = term.toLowerCase();
  const isAscii = /^[a-z0-9-]+$/.test(lower);
  const isKatakana = /^[\u30a1-\u30f6ー]+$/.test(term);
  const isLiteraryTerm = RARE_LITERARY_TERMS.has(term);
  const kanjiInfo = evaluateKanjiDifficulty(term);
  const kanjiCount = kanjiInfo.kanjiCount;

  // 1. English / ASCII words: everyday English becomes N/R, rare/complex English scales up cleanly
  if (isAscii) {
    if (BASIC_ENGLISH_WORDS.has(lower) || lower.length <= 4) {
      return roll < 68 ? "N" : "R";
    }
    if (lower.length <= 7) {
      if (roll < 35) return "R";
      if (roll < 80) return "SR";
      if (roll < 95) return "SSR";
      return "UR";
    }
    if (roll < 15) return "R";
    if (roll < 55) return "SR";
    if (roll < 85) return "SSR";
    return "UR";
  }

  // 2. Katakana loanwords / modern katakana
  if (isKatakana) {
    if (BASIC_KATAKANA_WORDS.has(term) || term.length <= 3) {
      if (sudachiEntry && sudachiEntry.tier >= 3 && wordType === "UNKNOWN") {
        return roll < 45 ? "R" : "SR";
      }
      return roll < 60 ? "N" : "R";
    }
    if (sudachiEntry) {
      if (sudachiEntry.tier <= 0) {
        return roll < 58 ? "R" : roll < 94 ? "SR" : "SSR";
      }
      if (sudachiEntry.tier === 1) {
        return roll < 50 ? "R" : roll < 90 ? "SR" : "SSR";
      }
      return roll < 22 ? "R" : roll < 74 ? "SR" : roll < 96 ? "SSR" : "UR";
    }
    if (term.length >= 5 || wordType === "UNKNOWN") {
      if (roll < 25) return "R";
      if (roll < 68) return "SR";
      if (roll < 88) return "SSR";
      return "UR";
    }
    return roll < 70 ? "R" : "SR";
  }

  // 3. Japanese Kanji / Literary & Joyo-Kanji difficulty evaluation
  if (kanjiInfo.nonJoyoCount >= 2) {
    if (roll < 20) return "SR";
    if (roll < 70) return "SSR";
    return "UR";
  }
  if (kanjiInfo.nonJoyoCount === 1 || isLiteraryTerm) {
    // Everyday 1-kanji non-Joyo words (e.g., 飴・嘘・絆・罠・餅) stay R/SR instead of jumping to UR
    if (
      !isLiteraryTerm &&
      kanjiCount === 1 &&
      term.length === 1 &&
      (sudachiEntry ? sudachiEntry.tier <= 1 : wordType === "KNOWN")
    ) {
      return roll < 30 ? "N" : roll < 88 ? "R" : "SR";
    }
    if (roll < 35) return "SR";
    if (roll < 83) return "SSR";
    return "UR";
  }
  if (kanjiCount >= 4) {
    if (roll < 45) return "SR";
    if (roll < 90) return "SSR";
    return "UR";
  }
  if (wordType === "UNKNOWN" && !sudachiEntry && kanjiCount >= 2) {
    if (roll < 18) return "R";
    if (roll < 63) return "SR";
    if (roll < 86) return "SSR";
    return "UR";
  }
  if (kanjiInfo.maxLevel >= 7) {
    // Secondary Joyo kanji (middle-school+ level)
    // Single-kanji everyday verbs/adjectives/nouns (e.g., 鋭い・優しい・誓う) stay R/SR/SSR, never UR
    if (kanjiCount <= 1 && (sudachiEntry || wordType === "KNOWN")) {
      return roll < 45 ? "R" : roll < 94 ? "SR" : "SSR";
    }
    if (kanjiCount >= 3 || (sudachiEntry?.tier ?? 1) >= 2) {
      if (roll < 12) return "R";
      if (roll < 60) return "SR";
      if (roll < 92) return "SSR";
      return "UR";
    }
    return roll < 30 ? "R" : roll < 80 ? "SR" : "SSR";
  }
  if (kanjiInfo.maxLevel >= 4) {
    // Upper elementary grade 4-6 kanji
    return roll < 22 ? "N" : roll < 74 ? "R" : roll < 95 ? "SR" : "SSR";
  }
  if (kanjiInfo.maxLevel >= 1) {
    // Everyday elementary grade 1-3 kanji
    return roll < 62 ? "N" : roll < 95 ? "R" : "SR";
  }

  // Pure hiragana / non-kanji Japanese
  if ((sudachiEntry?.tier ?? 0) >= 2) {
    return roll < 45 ? "N" : roll < 90 ? "R" : "SR";
  }
  return roll < 82 ? "N" : "R";
}

/** Unified procedural generator for KNOWN fallbacks, English words, and non-UR UNKNOWN words */
export function createProceduralCard(
  term: string,
  reading: string,
  pos: PosCategory,
  posDetail1: string,
  wordType: "KNOWN" | "UNKNOWN",
  sudachiEntry?: SudachiLexEntry
): WordMasterEntry {
  const seed = hashStringToSeed(term.toLowerCase());
  const rank = rollProceduralRank(term, wordType, seed, sudachiEntry);
  if (rank === "UR") {
    return createDeterministicUR(term, pos);
  }

  const attribute = inferFallbackAttribute(term, pos, posDetail1);
  const cost =
    rank === "SSR"
      ? 2 + ((seed >>> 4) % 2) // 2 or 3
      : rank === "SR"
        ? 1 + ((seed >>> 4) % 2) // 1 or 2
        : 1;

  const baseAtk =
    rank === "SSR"
      ? cost >= 3
        ? 96 + ((seed >>> 6) % 34)
        : 68 + ((seed >>> 6) % 24)
      : rank === "SR"
        ? cost >= 2
          ? 52 + ((seed >>> 6) % 22)
          : 34 + ((seed >>> 6) % 14)
        : rank === "R"
          ? 24 + ((seed >>> 6) % 14)
          : 14 + ((seed >>> 6) % 12);

  const baseDef =
    rank === "SSR"
      ? cost >= 3
        ? 68 + ((seed >>> 10) % 32)
        : 46 + ((seed >>> 10) % 24)
      : rank === "SR"
        ? cost >= 2
          ? 38 + ((seed >>> 10) % 20)
          : 26 + ((seed >>> 10) % 14)
        : rank === "R"
          ? 20 + ((seed >>> 10) % 14)
          : 12 + ((seed >>> 10) % 12);

  const isEng = isEnglishWord(term);
  const skillPool: { type: SkillType; power: number }[] = isEng
    ? rank === "SSR"
      ? cost >= 3
        ? [
            { type: "english_link", power: 1.8 },
            { type: "english_discount", power: 180 },
            { type: "english_purge", power: 2.3 },
          ]
        : [
            { type: "english_link", power: 1.3 },
            { type: "english_discount", power: 120 },
            { type: "english_purge", power: 1.95 },
          ]
      : rank === "SR"
        ? cost >= 2
          ? [
              { type: "english_link", power: 1.1 },
              { type: "english_discount", power: 90 },
              { type: "english_purge", power: 1.8 },
            ]
          : [
              { type: "english_link", power: 0.8 },
              { type: "english_discount", power: 65 },
              { type: "english_purge", power: 1.55 },
            ]
        : rank === "R"
          ? [
              { type: "english_link", power: 0.7 },
              { type: "english_discount", power: 55 },
              { type: "english_purge", power: 1.55 },
            ]
          : [
              { type: "english_link", power: 0.4 },
              { type: "english_discount", power: 30 },
              { type: "english_purge", power: 1.35 },
            ]
    : rank === "SSR"
      ? cost >= 3
        ? [
            { type: "mult_battle", power: 2.5 },
            { type: "retrigger_next", power: 2 },
            { type: "pierce_burst", power: 2.3 },
            { type: "sacrifice_mult", power: 5 },
            { type: "curse_stack", power: 1.3 },
          ]
        : [
            { type: "mult_battle", power: 1.95 },
            { type: "mult_next", power: 2.5 },
            { type: "retrigger_next", power: 1 },
            { type: "accumulate_cards", power: 1.2 },
            { type: "moroha_edge", power: 4 },
            { type: "self_harm_mult", power: 0.25 },
          ]
      : rank === "SR"
        ? cost >= 2
          ? [
              { type: "mult_battle", power: 1.6 },
              { type: "retrigger_next", power: 1 },
              { type: "pierce_burst", power: 1.65 },
              { type: "skill_chain", power: 1.35 },
              { type: "cost_amp", power: 1.3 },
              { type: "mimic_last", power: 0.5 },
              { type: "pursuit_combo", power: 1 },
              { type: "vengeance_flat", power: 2 },
              { type: "f_resonance", power: 1.5 },
            ]
          : [
              { type: "mult_battle", power: 1.35 },
              { type: "mult_next", power: 1.8 },
              { type: "draw", power: 2 },
              { type: "diversity_mult", power: 0.8 },
              { type: "f_sacrifice", power: 3 },
            ]
        : rank === "R"
          ? [
              { type: "mult_next", power: 1.5 },
              { type: "draw", power: 1 },
              { type: "weaken", power: 25 },
              { type: "retrigger_next", power: 1 },
              { type: "desperation_mult", power: 3 },
              { type: "f_invert", power: 2 },
              { type: "diversity_mult", power: 0.8 },
              { type: "guard_stock", power: 0.5 },
            ]
          : [
              { type: "draw", power: 1 },
              { type: "energy", power: 1 },
              { type: "mult_next", power: 1.3 },
              { type: "weaken", power: 20 },
              { type: "diversity_mult", power: 0.5 },
              { type: "guard_stock", power: 0.35 },
            ];

  const skill = skillPool[(seed >>> 15) % skillPool.length];
  const displayReading = /^[A-Za-z0-9-]+$/.test(term)
    ? term.toLowerCase()
    : katakanaToHiragana(reading || term);

  return {
    term,
    reading: displayReading,
    pos,
    rank,
    attribute,
    cost,
    baseAtk,
    baseDef,
    skillType: skill.type,
    skillPower: skill.power,
    skillDesc: formatSkillDescription(skill.type, skill.power),
  };
}

function createNoiseFCard(term: string, reason: string): WordMasterEntry {
  return {
    term,
    reading: term,
    pos: "other",
    rank: "F",
    attribute: "emotion",
    cost: 1,
    baseAtk: 10,
    baseDef: 5,
    skillType: "chaos_curse",
    skillPower: 1.5,
    skillDesc: `【${reason}】${formatSkillDescription("chaos_curse", 1.5)}`,
  };
}

export interface MinedCardResult {
  entry: WordMasterEntry;
  snippet: string;
  countInText: number;
  isRepeatedPenalty: boolean;
  isUnknownGenerated: boolean;
}

export interface AnalyzeSummary {
  packCards: MinedCardResult[];
  totalExtractedWords: number;
  attributeCounts: Record<Attribute, number>;
  repeatedTerms: string[];
  hasPredicate: boolean;
}

const RANK_PRIORITY: Record<Rank, number> = {
  UR: 6,
  SSR: 5,
  SR: 4,
  R: 3,
  N: 2,
  F: 1,
};

function extractSnippet(fullText: string, surface: string): string {
  const idx = fullText.indexOf(surface);
  if (idx === -1) return fullText.slice(0, 40);
  const start = Math.max(0, idx - 12);
  const end = Math.min(fullText.length, idx + surface.length + 18);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < fullText.length ? "…" : "";
  return `${prefix}${fullText.slice(start, end).replace(/\s+/g, " ")}${suffix}`;
}

const STOPWORDS = new Set([
  "する",
  "いる",
  "ある",
  "なる",
  "できる",
  "れる",
  "られる",
  "こと",
  "もの",
  "ため",
  "よう",
  "そう",
  "これ",
  "それ",
  "あれ",
  "どれ",
  "ここ",
  "そこ",
  "さん",
  "くん",
  "ちゃん",
  "感じ",
]);

export const MINING_SAMPLE_TEXTS: { label: string; text: string }[] = [
  {
    label: "論理の企画書風",
    text: "現状の施策は理想と大きく乖離している。したがって、前提となる構造を再定義する必要がある。仮説の妥当性を精査したうえで抜本的な体系へ刷新すれば、必然的に成果へ帰結する蓋然性が高い。",
  },
  {
    label: "激動の創作・感情文",
    text: "漆黒の蒼穹に閃光が轟く刹那、抑えきれぬ激情と渇望が胸を焦がす。どれほどの葛藤と絶望に震える夜を越えても、心の奥底に宿る矜持だけは決して儚く消えはしない。",
  },
  {
    label: "口癖まみれの雑文（不狙い）",
    text: "えっと、なんか今日の会議マジでやばい雰囲気だったと思う。とりあえずやばいやばいやばいやばいって感じで、なんかもうてきとうに進めるしかないかなーって感じ。",
  },
];

export async function analyzeTextForPack(
  text: string,
  maxPackCards = 6
): Promise<AnalyzeSummary> {
  const trimmed = text.trim().slice(0, 2500);
  const [tokenizer, sudachi] = await Promise.all([
    getTokenizer(),
    getSudachiLexicon(),
  ]);
  const tokens = tokenizer.tokenize(trimmed);

  const countMap = new Map<
    string,
    {
      token: KuromojiToken;
      count: number;
      snippet: string;
      sudachiEntry?: SudachiLexEntry;
    }
  >();

  const addExtractedWord = (
    term: string,
    token: KuromojiToken,
    surfaceForSnippet: string,
    sudachiEntry?: SudachiLexEntry
  ) => {
    const existing = countMap.get(term);
    if (existing) {
      existing.count += 1;
      if (!existing.sudachiEntry && sudachiEntry) {
        existing.sudachiEntry = sudachiEntry;
      }
    } else {
      countMap.set(term, {
        token,
        count: 1,
        snippet: extractSnippet(trimmed, surfaceForSnippet),
        sudachiEntry,
      });
    }
  };

  const allowedPos = new Set(["名詞", "動詞", "形容詞", "副詞", "接続詞", "感動詞"]);
  const compoundStartPos = new Set(["名詞", "動詞", "形容詞", "副詞", "接頭詞", "感動詞"]);

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];

    // Try merging 2..4 consecutive tokens if SudachiDict recognizes the compound / modern word
    let mergedLen = 0;
    if (
      sudachi.size > 0 &&
      compoundStartPos.has(tk.pos) &&
      !["数", "非自立", "代名詞"].includes(tk.pos_detail_1)
    ) {
      for (let len = Math.min(4, tokens.length - i); len >= 2; len--) {
        const slice = tokens.slice(i, i + len);
        if (slice.some((s) => s.pos === "記号" || s.pos === "助詞")) continue;
        const last = slice[slice.length - 1];
        const joinedSurface = slice.map((s) => s.surface_form).join("");
        const lastBase =
          last.basic_form && last.basic_form !== "*"
            ? last.basic_form
            : last.surface_form;
        const joinedBase =
          slice
            .slice(0, -1)
            .map((s) => s.surface_form)
            .join("") + lastBase;

        const matchTerm = sudachi.has(joinedBase)
          ? joinedBase
          : sudachi.has(joinedSurface)
            ? joinedSurface
            : null;
        if (matchTerm && matchTerm.length >= 2) {
          const sEntry = sudachi.get(matchTerm)!;
          if (!STOPWORDS.has(matchTerm) || getWordMaster(matchTerm)) {
            addExtractedWord(
              matchTerm,
              {
                surface_form: joinedSurface,
                pos: tk.pos,
                pos_detail_1: tk.pos_detail_1,
                basic_form: matchTerm,
                reading: sEntry.reading,
                word_type: "KNOWN",
              },
              joinedSurface,
              sEntry
            );
            mergedLen = len;
            break;
          }
        }
      }
    }
    if (mergedLen > 0) {
      i += mergedLen - 1;
      continue;
    }

    const base =
      tk.basic_form && tk.basic_form !== "*" ? tk.basic_form : tk.surface_form;
    if (!base || base.length === 0) continue;

    const sEntry = sudachi.get(base) ?? sudachi.get(tk.surface_form);
    if (!allowedPos.has(tk.pos) && !sEntry) continue;
    if (["数", "非自立", "接尾", "代名詞"].includes(tk.pos_detail_1) && !sEntry) continue;
    if (STOPWORDS.has(base) && !getWordMaster(base)) continue;
    if (/^[0-9０-９\s.,。、！？!?「」『』()（）]+$/.test(base)) continue;
    if (base.length === 1 && /^[ぁ-ん]$/.test(base) && !getWordMaster(base)) continue;

    const normalizedToken: KuromojiToken = sEntry
      ? {
          ...tk,
          reading: tk.reading || sEntry.reading,
          word_type: "KNOWN",
        }
      : tk;
    addExtractedWord(base, normalizedToken, tk.surface_form, sEntry);
  }

  // Also detect curated idioms and maniac multi-morpheme terms that kuromoji might split
  for (const master of WORD_MASTER_LIST) {
    if (
      (master.pos === "idiom" ||
        master.themePack === "maniac_pack" ||
        master.themePack === "taboo_combo_pack") &&
      trimmed.includes(master.term)
    ) {
      if (!countMap.has(master.term)) {
        countMap.set(master.term, {
          token: {
            surface_form: master.term,
            pos: "名詞",
            pos_detail_1: "一般",
            basic_form: master.term,
            reading: master.reading,
            word_type: "KNOWN",
          },
          count: 1,
          snippet: extractSnippet(trimmed, master.term),
        });
      }
    }
  }

  const allCandidates: MinedCardResult[] = [];
  const attributeCounts: Record<Attribute, number> = {
    logic: 0,
    emotion: 0,
    sense: 0,
    matter: 0,
  };

  for (const [term, info] of countMap.entries()) {
    const master = getWordMaster(term);
    const pos = info.sudachiEntry?.pos ?? mapPos(info.token.pos);
    const isSpam = info.count >= 4 && pos !== "conj";

    let entry: WordMasterEntry;
    let isUnknownGenerated = false;

    if (isSpam) {
      entry = createNoiseFCard(term, `${info.count}回連呼による劣化`);
    } else if (master) {
      entry = master;
    } else if (info.token.word_type === "KNOWN" || info.sudachiEntry) {
      entry = createProceduralCard(
        term,
        info.token.reading || info.sudachiEntry?.reading || term,
        pos,
        info.token.pos_detail_1,
        "KNOWN",
        info.sudachiEntry
      );
      if (entry.rank === "UR") isUnknownGenerated = true;
    } else if (isPlausibleUnknownWord(term)) {
      entry = createProceduralCard(
        term,
        info.token.reading || term,
        pos,
        info.token.pos_detail_1,
        "UNKNOWN"
      );
      if (entry.rank === "UR") isUnknownGenerated = true;
    } else {
      entry = createNoiseFCard(term, "未定義ノイズ");
    }

    attributeCounts[entry.attribute] += info.count;
    allCandidates.push({
      entry,
      snippet: info.snippet,
      countInText: info.count,
      isRepeatedPenalty: isSpam,
      isUnknownGenerated,
    });
  }

  // Pack selection: up to maxPackCards distinct cards, prioritizing rare + spam F + balanced mix
  allCandidates.sort((a, b) => {
    const scoreA = RANK_PRIORITY[a.entry.rank] * 10 + (a.isRepeatedPenalty ? 55 : 0);
    const scoreB = RANK_PRIORITY[b.entry.rank] * 10 + (b.isRepeatedPenalty ? 55 : 0);
    return scoreB - scoreA;
  });

  const limit = Math.max(1, Math.floor(maxPackCards));
  const packCards: MinedCardResult[] = [];
  if (allCandidates.length <= limit) {
    packCards.push(...allCandidates);
  } else if (limit <= 6) {
    packCards.push(...allCandidates.slice(0, Math.min(4, limit)));
    const tail = allCandidates.slice(4);
    const midIdx = Math.floor(tail.length / 2);
    if (tail[0] && packCards.length < limit) packCards.push(tail[0]);
    if (tail[midIdx] && tail[midIdx] !== tail[0] && packCards.length < limit) {
      packCards.push(tail[midIdx]);
    } else if (tail[1] && packCards.length < limit) {
      packCards.push(tail[1]);
    }
  } else {
    // Larger impromptu pool: keep top cards + balanced spread of lower-cost / common cards
    const headCount = Math.ceil(limit * 0.6);
    packCards.push(...allCandidates.slice(0, headCount));
    const tail = allCandidates.slice(headCount);
    const needed = limit - packCards.length;
    if (tail.length <= needed) {
      packCards.push(...tail);
    } else {
      const step = tail.length / needed;
      for (let i = 0; i < needed; i++) {
        const pick = tail[Math.min(tail.length - 1, Math.floor(i * step))];
        if (pick && !packCards.includes(pick)) {
          packCards.push(pick);
        }
      }
    }
  }

  const finalPack = packCards.slice(0, limit);
  const repeatedTerms = finalPack
    .filter((c) => c.isRepeatedPenalty)
    .map((c) => c.entry.term);

  const hasPredicate = allCandidates.some(
    (c) =>
      c.entry.pos === "verb" ||
      c.entry.pos === "adj" ||
      c.entry.pos === "adv"
  );

  return {
    packCards: finalPack,
    totalExtractedWords: allCandidates.length,
    attributeCounts,
    repeatedTerms,
    hasPredicate,
  };
}
