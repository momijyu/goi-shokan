import { generateEndlessEnemy, getStageDef, type StageDef } from "@/data/enemies";
import {
  BLACK_COVENANT_RELICS,
  getRelicDef,
  NORMAL_RELICS,
  REPEATABLE_RELICS,
  WHITE_REVELATION_RELICS,
} from "@/data/relics";
import {
  getWordMaster,
  WORD_MASTER_LIST,
} from "@/data/words";
import {
  createSeededRng,
  formatJapaneseNumber,
  getTodayJstDateKey,
  hashStringToSeed,
} from "@/lib/bignum";
import {
  PLUS_STAT_STEP,
  type Attribute,
  type BattleCard,
  type CommandRole,
  type EnemyDef,
  type EnemyIntent,
  type PlayerSaveData,
  type RelicDef,
  type WordMasterEntry,
} from "@/types/game";

export const MAX_HAND_SIZE = 10;

export type RunDeckMode = "standard" | "random" | "impromptu";
export type RandomDeckStyle = "chaos" | "mult" | "self_harm" | "chain";

export const RANDOM_STYLE_META: {
  id: RandomDeckStyle;
  label: string;
  description: string;
}[] = [
  {
    id: "chaos",
    label: "おまかせ（全語彙）",
    description: "全語彙マスターから完全無作為に初期デッキ・報酬を抽選",
  },
  {
    id: "mult",
    label: "乗算・重撃",
    description: "戦闘乗算・次札乗算・貫通・再発動系を中心に選出",
  },
  {
    id: "self_harm",
    label: "自傷・背水『不』",
    description: "自傷・背水・『不』反転と『不』カードが必ず混ざる即席構成",
  },
  {
    id: "chain",
    label: "連鎖・手数",
    description: "ドロー・コスト回復・スキル連鎖・追撃系を中心に選出",
  },
];

export interface StartRunOptions {
  mode?: RunDeckMode;
  randomStyle?: RandomDeckStyle;
  impromptuEntries?: WordMasterEntry[];
}

export type RunPhase =
  | "battle"
  | "reward_card"
  | "reward_relic"
  | "event_covenant"
  | "event_library"
  | "stage_clear"
  | "gameover";

export interface OutputBreakdown {
  baseOutput: number;
  flatAdd: number;
  multiplier: number;
  exponent: number;
  retriggers: number;
  finalOutput: number;
  role: CommandRole;
  cardTerm: string;
  didDamage?: boolean;
  didShield?: boolean;
}

export interface RunState {
  runId: string;
  stageId: string;
  stageName: string;
  isDaily: boolean;
  runMode: RunDeckMode;
  randomStyle?: RandomDeckStyle;
  impromptuPool?: WordMasterEntry[];
  rngSeed: number;
  rngStep: number;
  phase: RunPhase;
  floor: number;
  totalStageFloors: number;
  isEndless: boolean;
  turn: number;
  cardsPlayedThisTurn: number;
  totalCardsPlayedInBattle: number;
  totalCardsPlayedInRun: number;
  tengenPermanentMult: number;
  permanentExponentBonus: number;
  permanentFlatAdd: number;
  permanentMultBonus: number;

  playerHp: number;
  playerMaxHp: number;
  playerShield: number;
  energy: number;
  maxEnergy: number;

  deck: BattleCard[];
  drawPile: BattleCard[];
  hand: BattleCard[];
  discardPile: BattleCard[];
  playedThisTurn: BattleCard[];
  relicIds: string[];

  // Battle-scoped scaling state
  battleFlatAdd: number;
  battleMult: number;
  battleExponent: number;
  nextCardMult: number;
  nextCardRetrigger: number;
  nextAttackMult: number;
  nextAttackFlatAdd: number;
  nextFInverted: boolean;
  nextFInvertMult: number;
  pendingSelfHarmPctAfterAttack: number;
  selfHarmHpTotalInBattle: number;
  selfHarmCountInBattle: number;
  skillsPlayedThisTurn: number;
  attacksPlayedThisTurn: number;
  guardsPlayedInBattle: number;
  energySpentThisTurn: number;
  attrsPlayedThisTurn: Attribute[];
  lastCombatAction: { role: "attack" | "guard"; output: number } | null;
  lastAttrPlayed: Attribute | null;
  attrsPlayedThisBattle: Attribute[];
  fourElementsTriggeredThisBattle: boolean;
  enemyWeakenPct: number;
  freeExtremeUsedThisTurn: boolean;
  highRankCostDiscountThisTurn: number;
  allCardCostDiscountThisTurn: number;
  zeroCostTriggersThisTurn: number;
  librarySkillDrawsThisTurn: number;
  whiteRingTriggeredThisTurn: boolean;
  staircaseStep: 0 | 1 | 2 | 3;

  // Enemy state
  enemy: EnemyDef;
  enemyHp: number;
  enemyShield: number;
  enemyAtkBonus: number;
  enemyIntentIdx: number;

  // Rewards & Events
  ownedVocabularyCount: number;
  cardChoices: BattleCard[];
  relicChoices: RelicDef[];
  covenantRefusedCount: number;
  covenantIsWhite: boolean;
  covenantOfferedRelic: RelicDef | null;
  covenantOfferedBlack: RelicDef | null;
  covenantOfferedWhite: RelicDef | null;
  libraryActionsRemaining: number;

  // Logs & Stats
  lastOutput: OutputBreakdown | null;
  maxDamageDealt: number;
  encounteredEnemyIds: string[];
  logs: string[];
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toBattleCard(
  entry: WordMasterEntry,
  plusLevel: number,
  suffix: string,
  isTemporaryTrial = false
): BattleCard {
  return {
    ...entry,
    instanceId: `${entry.term}_${suffix}_${Math.random().toString(36).slice(2, 7)}`,
    plusLevel,
    isTemporaryTrial,
  };
}

function pickEnemyForFloor(
  stage: StageDef,
  floor: number,
  isEndless: boolean,
  rng: () => number
): EnemyDef {
  if (isEndless) {
    const endlessDepth = floor - stage.totalFloors;
    return generateEndlessEnemy(endlessDepth, stage.boss.maxHp, rng);
  }
  if (floor >= stage.totalFloors) {
    return stage.boss;
  }
  const pool = stage.enemies;
  const idx = Math.floor(rng() * pool.length);
  const picked = pool[idx];
  const scale = 1 + (floor - 1) * 0.18;
  const earlyMult =
    stage.earlyHalfHpFloors && floor <= stage.earlyHalfHpFloors ? 0.5 : 1;
  return {
    ...picked,
    maxHp: Math.max(1, Math.floor(picked.maxHp * scale * earlyMult)),
  };
}

function getEnemyBaseMaxAtk(enemy: EnemyDef): number {
  const atkValues = enemy.pattern
    .filter((p) => p.type === "attack" || p.type === "heavy_attack")
    .map((p) => p.value);
  return atkValues.length > 0 ? Math.max(...atkValues) : 20;
}

export function getEnemyCurrentIntent(state: RunState): EnemyIntent {
  const base = state.enemy.pattern[state.enemyIntentIdx % state.enemy.pattern.length];
  const isEnragedOverride =
    state.turn >= 6 &&
    state.enemyAtkBonus > 0 &&
    base.type !== "attack" &&
    base.type !== "heavy_attack";
  if (
    base.type === "attack" ||
    base.type === "heavy_attack" ||
    isEnragedOverride
  ) {
    const baseAtk = isEnragedOverride ? getEnemyBaseMaxAtk(state.enemy) : base.value;
    const sereneMult = state.relicIds.includes("white_revelation_serene") ? 0.8 : 1;
    // Weaken reduces the enemy's base attack, while bonus ATK from enrage/buffs bypasses weaken
    const weakenedBase = Math.floor(
      baseAtk * sereneMult * (1 - state.enemyWeakenPct / 100)
    );
    const totalAtk = Math.max(1, weakenedBase + state.enemyAtkBonus);
    return {
      type: isEnragedOverride ? "heavy_attack" : base.type,
      value: totalAtk,
      label: isEnragedOverride
        ? `激昂強襲 ${totalAtk}`
        : base.label.replace(/\d+/, String(totalAtk)),
    };
  }
  return base;
}

function pickRandomByRarity(
  ownedList: WordMasterEntry[],
  rank: "N" | "R",
  count: number,
  rng: () => number,
  excludeTerm?: string
): WordMasterEntry[] {
  const ownedPool = shuffleWithRng(
    ownedList.filter((w) => w.rank === rank && w.term !== excludeTerm),
    rng
  );
  const picked: WordMasterEntry[] = ownedPool.slice(0, count);
  if (picked.length < count) {
    const used = new Set(picked.map((p) => p.term));
    const fallbackPool = shuffleWithRng(
      WORD_MASTER_LIST.filter(
        (w) => w.rank === rank && w.term !== excludeTerm && !used.has(w.term)
      ),
      rng
    );
    picked.push(...fallbackPool.slice(0, count - picked.length));
  }
  return picked;
}

const STYLE_SKILL_MAP: Record<Exclude<RandomDeckStyle, "chaos">, Set<WordMasterEntry["skillType"]>> = {
  mult: new Set(["mult_battle", "mult_next", "pierce_burst", "retrigger_next"]),
  self_harm: new Set([
    "desperation_mult",
    "sacrifice_mult",
    "vengeance_flat",
    "self_harm_mult",
    "curse_stack",
    "moroha_edge",
    "f_resonance",
    "f_invert",
    "f_sacrifice",
    "chaos_curse",
  ]),
  chain: new Set([
    "draw",
    "energy",
    "skill_chain",
    "cost_amp",
    "pursuit_combo",
    "diversity_mult",
    "mimic_last",
    "accumulate_cards",
    "retrigger_next",
    "english_link",
    "english_discount",
  ]),
};

function matchesRandomStyle(word: WordMasterEntry, style: RandomDeckStyle): boolean {
  if (style === "chaos") return true;
  return STYLE_SKILL_MAP[style].has(word.skillType);
}

function buildRandomStarterDeck(
  style: RandomDeckStyle,
  save: PlayerSaveData,
  rng: () => number
): BattleCard[] {
  const picked: WordMasterEntry[] = [];
  const used = new Set<string>();

  const pickFrom = (candidates: WordMasterEntry[], count: number) => {
    const shuffled = shuffleWithRng(
      candidates.filter((w) => !used.has(w.term)),
      rng
    );
    for (const item of shuffled.slice(0, count)) {
      used.add(item.term);
      picked.push(item);
    }
  };

  if (style === "chaos") {
    pickFrom(WORD_MASTER_LIST.filter((w) => w.rank === "N"), 3);
    pickFrom(WORD_MASTER_LIST.filter((w) => w.rank === "R"), 2);
    pickFrom(WORD_MASTER_LIST.filter((w) => w.rank === "SR"), 1);
    pickFrom(WORD_MASTER_LIST.filter((w) => w.rank === "SSR" || w.rank === "UR"), 1);
  } else if (style === "self_harm") {
    pickFrom(
      WORD_MASTER_LIST.filter(
        (w) => w.cost <= 1 && (w.rank === "N" || w.rank === "R")
      ),
      2
    );
    pickFrom(WORD_MASTER_LIST.filter((w) => w.rank === "F"), 1);
    pickFrom(
      WORD_MASTER_LIST.filter(
        (w) => matchesRandomStyle(w, "self_harm") && w.rank !== "F" && w.rank !== "SSR"
      ),
      3
    );
    pickFrom(
      WORD_MASTER_LIST.filter(
        (w) => matchesRandomStyle(w, "self_harm") && (w.rank === "SSR" || w.rank === "SR")
      ),
      1
    );
  } else {
    pickFrom(
      WORD_MASTER_LIST.filter(
        (w) => w.cost <= 1 && (w.rank === "N" || w.rank === "R") && matchesRandomStyle(w, style)
      ),
      2
    );
    pickFrom(
      WORD_MASTER_LIST.filter((w) => w.cost <= 1 && (w.rank === "N" || w.rank === "R")),
      1
    );
    pickFrom(
      WORD_MASTER_LIST.filter(
        (w) => matchesRandomStyle(w, style) && (w.rank === "R" || w.rank === "SR")
      ),
      3
    );
    pickFrom(
      WORD_MASTER_LIST.filter(
        (w) => matchesRandomStyle(w, style) && (w.rank === "SSR" || w.rank === "UR")
      ),
      1
    );
  }

  if (picked.length < 7) {
    pickFrom(WORD_MASTER_LIST.filter((w) => w.rank !== "F"), 7 - picked.length);
  }

  return picked.map((entry, i) =>
    toBattleCard(entry, 0, `rand_${style}_${i}`, !save.ownedWords[entry.term])
  );
}

function buildImpromptuStarterDeck(
  entries: WordMasterEntry[],
  rng: () => number
): { deck: BattleCard[]; pool: WordMasterEntry[] } {
  const uniqueMap = new Map<string, WordMasterEntry>();
  for (const e of entries) {
    if (!uniqueMap.has(e.term)) uniqueMap.set(e.term, e);
  }
  const pool = Array.from(uniqueMap.values());
  if (pool.length === 0) {
    const fallback = WORD_MASTER_LIST.slice(0, 6);
    return {
      deck: fallback.map((e, i) => toBattleCard(e, 0, `imp_fb_${i}`, false)),
      pool: fallback,
    };
  }

  const deck: BattleCard[] = [];
  if (pool.length <= 6) {
    pool.forEach((entry, i) => {
      deck.push(toBattleCard(entry, 0, `imp_${i}`, false));
    });
    const cycled = shuffleWithRng(pool, rng);
    let idx = 0;
    while (deck.length < 6) {
      const entry = cycled[idx % cycled.length];
      deck.push(toBattleCard(entry, 1, `imp_dup_${idx}`, false));
      idx += 1;
    }
    return { deck, pool };
  }

  const lowCost = shuffleWithRng(pool.filter((w) => w.cost <= 1), rng);
  const higher = pool.filter((w) => w.cost > 1);
  const chosen: WordMasterEntry[] = [];
  const used = new Set<string>();

  for (const w of lowCost.slice(0, 4)) {
    used.add(w.term);
    chosen.push(w);
  }
  for (const w of [...higher, ...lowCost]) {
    if (chosen.length >= 7) break;
    if (!used.has(w.term)) {
      used.add(w.term);
      chosen.push(w);
    }
  }
  return {
    deck: chosen.map((entry, i) => toBattleCard(entry, 0, `imp_${i}`, false)),
    pool,
  };
}

export function startNewRun(
  save: PlayerSaveData,
  stageId: string,
  isDaily: boolean,
  options?: StartRunOptions
): RunState {
  const stage = getStageDef(stageId);
  const seed = isDaily
    ? hashStringToSeed(`daily_${getTodayJstDateKey()}`)
    : hashStringToSeed(`${Date.now()}_${Math.random()}`);
  const rng = createSeededRng(seed);

  const runMode: RunDeckMode =
    options?.mode ??
    (stage.id === "stage_random"
      ? "random"
      : stage.id === "stage_impromptu"
        ? "impromptu"
        : "standard");
  const randomStyle: RandomDeckStyle = options?.randomStyle ?? "chaos";

  let deck: BattleCard[] = [];
  let impromptuPool: WordMasterEntry[] | undefined;

  if (runMode === "random") {
    deck = buildRandomStarterDeck(randomStyle, save, rng);
  } else if (runMode === "impromptu" && options?.impromptuEntries?.length) {
    const built = buildImpromptuStarterDeck(options.impromptuEntries, rng);
    deck = built.deck;
    impromptuPool = built.pool;
  } else {
    const aceOwned =
      save.ownedWords[save.aceTerm] ??
      getWordMaster(save.aceTerm) ??
      getWordMaster("示唆")!;

    const ownedList = Object.values(save.ownedWords);
    // Build randomized starter deck from owned words by rarity quota: 常×4 + 良×2 + エース×1
    const starterNormals = pickRandomByRarity(ownedList, "N", 4, rng, aceOwned.term);
    const starterRares = pickRandomByRarity(ownedList, "R", 2, rng, aceOwned.term);

    deck = [...starterNormals, ...starterRares].map((entry, i) =>
      toBattleCard(entry, 0, `start_${i}`)
    );
    deck.push(toBattleCard(aceOwned, 0, "ace"));
  }

  const ownedListCount = Object.keys(save.ownedWords).length;
  const firstEnemy = pickEnemyForFloor(stage, 1, false, rng);
  const drawPile = shuffleWithRng(deck, rng);
  const hand = drawPile.slice(0, Math.min(MAX_HAND_SIZE, 5));
  const remainingDraw = drawPile.slice(hand.length);

  const styleMeta = RANDOM_STYLE_META.find((s) => s.id === randomStyle);
  const resolvedStageName = isDaily
    ? `日替わり迷宮 (${getTodayJstDateKey()})`
    : runMode === "random" && styleMeta && randomStyle !== "chaos"
      ? `${stage.name}（${styleMeta.label}）`
      : stage.name;

  return {
    runId: `run_${Date.now()}`,
    stageId: stage.id,
    stageName: resolvedStageName,
    isDaily,
    runMode,
    randomStyle: runMode === "random" ? randomStyle : undefined,
    impromptuPool,
    rngSeed: seed,
    rngStep: 10,
    phase: "battle",
    floor: 1,
    totalStageFloors: stage.totalFloors,
    isEndless: false,
    turn: 1,
    cardsPlayedThisTurn: 0,
    totalCardsPlayedInBattle: 0,
    totalCardsPlayedInRun: 0,
    tengenPermanentMult: 1,
    permanentExponentBonus: 0,
    permanentFlatAdd: 0,
    permanentMultBonus: 1,
    playerHp: 80,
    playerMaxHp: 80,
    playerShield: 0,
    energy: 3,
    maxEnergy: 3,
    deck,
    drawPile: remainingDraw,
    hand,
    discardPile: [],
    playedThisTurn: [],
    relicIds: [],
    battleFlatAdd: 0,
    battleMult: 1,
    battleExponent: 1,
    nextCardMult: 1,
    nextCardRetrigger: 0,
    nextAttackMult: 1,
    nextAttackFlatAdd: 0,
    nextFInverted: false,
    nextFInvertMult: 1,
    pendingSelfHarmPctAfterAttack: 0,
    selfHarmHpTotalInBattle: 0,
    selfHarmCountInBattle: 0,
    skillsPlayedThisTurn: 0,
    attacksPlayedThisTurn: 0,
    guardsPlayedInBattle: 0,
    energySpentThisTurn: 0,
    attrsPlayedThisTurn: [],
    lastCombatAction: null,
    lastAttrPlayed: null,
    attrsPlayedThisBattle: [],
    fourElementsTriggeredThisBattle: false,
    enemyWeakenPct: 0,
    freeExtremeUsedThisTurn: false,
    highRankCostDiscountThisTurn: 0,
    allCardCostDiscountThisTurn: 0,
    zeroCostTriggersThisTurn: 0,
    librarySkillDrawsThisTurn: 0,
    whiteRingTriggeredThisTurn: false,
    staircaseStep: 0,
    enemy: firstEnemy,
    enemyHp: firstEnemy.maxHp,
    enemyShield: 0,
    enemyAtkBonus: 0,
    enemyIntentIdx: 0,
    ownedVocabularyCount: ownedListCount,
    cardChoices: [],
    relicChoices: [],
    covenantRefusedCount: 0,
    covenantIsWhite: false,
    covenantOfferedRelic: null,
    covenantOfferedBlack: null,
    covenantOfferedWhite: null,
    libraryActionsRemaining: 0,
    lastOutput: null,
    maxDamageDealt: 0,
    encounteredEnemyIds: [firstEnemy.id],
    logs: [`第1階：${firstEnemy.name} が立ちはだかる！`],
  };
}

export function getHandLimit(relicIds: string[]): number {
  return relicIds.includes("black_pact_truncate") ? 6 : MAX_HAND_SIZE;
}

export function getTurnMaxEnergy(relicIds: string[], turn = 1): number {
  let energy = 3;
  if (relicIds.includes("kotodama_fountain")) energy += 1;
  if (relicIds.includes("black_pact_glass")) energy += 2;
  if (relicIds.includes("white_revelation_apex")) energy += 1;
  if (relicIds.includes("black_pact_blitz") && turn <= 2) energy += 3;
  if (relicIds.includes("empty_pocket")) energy -= 1;
  if (relicIds.includes("black_pact_solo")) energy -= 1;
  return Math.max(1, energy);
}

export function getTurnDrawCount(relicIds: string[], isTurnOne: boolean): number {
  let count = 5;
  if (relicIds.includes("chi_honryu")) count += 2;
  if (relicIds.includes("white_revelation_apex")) count += 1;
  if (relicIds.includes("black_pact_truncate")) count -= 1;
  if (isTurnOne && relicIds.includes("sokudoku_master")) count += 3;
  if (isTurnOne && relicIds.includes("black_pact_glass")) count += 1;
  return Math.max(3, count);
}

export function getEffectiveCardCost(state: RunState, card: BattleCard): number {
  if (state.relicIds.includes("first_zero") && state.cardsPlayedThisTurn === 0) {
    return 0;
  }
  const hasTsuneRebel = state.relicIds.includes("tsune_rebel");
  const hasWhiteOmega = state.relicIds.includes("white_revelation_omega");
  if (hasTsuneRebel && card.rank === "N") return 0;
  if (hasWhiteOmega && card.rank === "SSR" && !state.freeExtremeUsedThisTurn) return 0;

  let effective = card.cost - state.allCardCostDiscountThisTurn;
  if (
    state.relicIds.includes("black_pact_heavy") &&
    (card.rank === "N" || card.rank === "R")
  ) {
    effective += 1;
  }
  if (state.relicIds.includes("white_revelation_foresight") && state.turn === 1) {
    effective -= 1;
  }
  if (
    state.relicIds.includes("tsune_resonator") &&
    state.highRankCostDiscountThisTurn > 0 &&
    (card.rank === "SR" || card.rank === "SSR" || card.rank === "UR")
  ) {
    effective -= state.highRankCostDiscountThisTurn;
  }
  return Math.max(0, effective);
}

/**
 * Returns a human-readable live preview of what a conditional/scaling skill
 * will produce right now if activated from hand.
 */
export function getDynamicSkillPreview(
  state: RunState,
  card: BattleCard
): string | null {
  const otherHand = state.hand.filter((c) => c.instanceId !== card.instanceId);
  switch (card.skillType) {
    case "cost_amp": {
      const nextSpent = Math.min(
        12,
        state.energySpentThisTurn + getEffectiveCardCost(state, card)
      );
      const mult = Math.pow(card.skillPower, nextSpent);
      return `今すぐ発動時：消費コスト${nextSpent}分 → 次攻撃 ×${mult.toFixed(2)}`;
    }
    case "skill_chain": {
      const stacks = Math.min(10, state.skillsPlayedThisTurn);
      const mult = Math.pow(card.skillPower, stacks);
      return `今すぐ発動時：スキル${stacks}回分 → 次攻撃 ×${mult.toFixed(2)}`;
    }
    case "accumulate_cards": {
      const stacks = Math.min(15, state.totalCardsPlayedInBattle);
      const mult = Math.pow(card.skillPower, stacks);
      return `今すぐ発動時：使用${stacks}枚分 → 次攻撃 ×${mult.toFixed(2)}`;
    }
    case "diversity_mult": {
      const attrs = new Set([...state.attrsPlayedThisTurn, card.attribute]);
      const add = attrs.size * card.skillPower;
      return `今すぐ発動時：${attrs.size}属性 → 戦闘倍率 +${add.toFixed(1)}`;
    }
    case "guard_stock": {
      const stacks = Math.min(16, state.guardsPlayedInBattle);
      const mult = 1 + stacks * card.skillPower;
      return `今すぐ発動時：防御${stacks}回 → 次攻撃 ×${mult.toFixed(1)}`;
    }
    case "pursuit_combo": {
      const add = Math.min(11, state.attacksPlayedThisTurn * card.skillPower);
      return `今すぐ発動時：攻撃${state.attacksPlayedThisTurn}回 → 次カード再発動 +${add}`;
    }
    case "vengeance_flat": {
      const bonus = state.selfHarmHpTotalInBattle * card.skillPower;
      return `今すぐ発動時：自傷累計${state.selfHarmHpTotalInBattle}HP → 次攻撃基礎 +${bonus}`;
    }
    case "self_harm_mult": {
      const add = state.selfHarmHpTotalInBattle * card.skillPower;
      return `今すぐ発動時：自傷累計${state.selfHarmHpTotalInBattle}HP → 戦闘倍率 +${add.toFixed(2)}`;
    }
    case "curse_stack": {
      const stacks = Math.min(12, state.selfHarmCountInBattle);
      const mult = Math.pow(card.skillPower, stacks);
      return `今すぐ発動時：自傷${stacks}回 → 戦闘倍率 ×${mult.toFixed(2)}`;
    }
    case "f_resonance": {
      const otherF = Math.min(6, otherHand.filter((c) => c.rank === "F").length);
      const mult = Math.pow(card.skillPower, otherF);
      return `今すぐ発動時：他手札の『不』${otherF}枚 → 戦闘倍率 ×${mult.toFixed(2)}`;
    }
    case "f_sacrifice": {
      const hasF = otherHand.some((c) => c.rank === "F");
      return hasF
        ? `今すぐ発動時：手札の『不』を1枚除外 → 次攻撃 ×${card.skillPower}`
        : "今すぐ発動時：手札に『不』がないため不発";
    }
    case "desperation_mult": {
      const pct = Math.round((state.playerHp / state.playerMaxHp) * 100);
      const ok = state.playerHp <= state.playerMaxHp * 0.3;
      return ok
        ? `発動条件達成（現在HP ${pct}% / 30%以下）→ 次攻撃 ×${card.skillPower}`
        : `条件未達成（現在HP ${pct}% / 30%以下が必要）`;
    }
    case "sacrifice_mult": {
      const sacLoss = Math.min(
        Math.max(0, state.playerHp - 1),
        Math.max(1, Math.floor(state.playerHp * 0.5))
      );
      return `今すぐ発動時：HP -${sacLoss} 消費 → 次攻撃 ×${card.skillPower}`;
    }
    case "english_link": {
      const engCount =
        otherHand.filter((c) => /^[A-Za-z][A-Za-z0-9-]*$/.test(c.term)).length + 1;
      return `今すぐ発動時：対象英語${engCount}枚 → 戦闘倍率 +${(card.skillPower * engCount).toFixed(1)}`;
    }
    case "mimic_last": {
      if (!state.lastCombatAction) {
        return "今すぐ発動時：直前に『こうげき』か『ぼうぎょ』がないため不発";
      }
      const val = Math.max(
        1,
        Math.floor(state.lastCombatAction.output * card.skillPower)
      );
      const label = state.lastCombatAction.role === "attack" ? "ダメージ" : "シールド";
      return `今すぐ発動時：直前行動の50% → ${formatJapaneseNumber(val).text} ${label}`;
    }
    default:
      return null;
  }
}

function drawCards(
  drawPile: BattleCard[],
  discardPile: BattleCard[],
  count: number,
  rng: () => number
): { drawn: BattleCard[]; nextDraw: BattleCard[]; nextDiscard: BattleCard[] } {
  let d = [...drawPile];
  let disc = [...discardPile];
  const drawn: BattleCard[] = [];

  for (let i = 0; i < count; i++) {
    if (d.length === 0) {
      if (disc.length === 0) break;
      d = shuffleWithRng(disc, rng);
      disc = [];
    }
    const top = d.shift();
    if (top) drawn.push(top);
  }
  return { drawn, nextDraw: d, nextDiscard: disc };
}

function drawIntoHand(
  nextDraw: BattleCard[],
  nextDiscard: BattleCard[],
  nextHand: BattleCard[],
  desiredCount: number,
  rng: () => number,
  handLimit = MAX_HAND_SIZE,
  hasWhiteBlank = false
): { nextDraw: BattleCard[]; nextDiscard: BattleCard[]; nextHand: BattleCard[] } {
  let d = nextDraw;
  let disc = nextDiscard;
  let hand = nextHand;
  let toDraw = desiredCount;
  let safety = 0;

  while (toDraw > 0 && hand.length < handLimit && safety < handLimit) {
    safety += 1;
    const capacity = Math.max(0, handLimit - hand.length);
    const actualCount = Math.min(toDraw, capacity);
    if (actualCount <= 0) break;
    const res = drawCards(d, disc, actualCount, rng);
    d = res.nextDraw;
    disc = res.nextDiscard;
    if (res.drawn.length === 0) break;
    hand = [...hand, ...res.drawn];
    toDraw = hasWhiteBlank ? res.drawn.filter((c) => c.rank === "F").length : 0;
  }

  return { nextDraw: d, nextDiscard: disc, nextHand: hand };
}

function applySelfHarm(state: RunState, rawLoss: number): number {
  const prevHp = state.playerHp;
  const clampedLoss = Math.max(0, Math.floor(rawLoss));
  const nextHp = Math.max(1, prevHp - clampedLoss);
  const actualLost = Math.max(0, prevHp - nextHp);
  state.playerHp = nextHp;
  if (clampedLoss > 0) {
    state.selfHarmCountInBattle += 1;
    state.selfHarmHpTotalInBattle += actualLost;
    if (actualLost > 0 && state.relicIds.includes("pain_transmute")) {
      const bonus = actualLost * 100;
      state.permanentFlatAdd += bonus;
      state.battleFlatAdd += bonus;
    }
  }
  return actualLost;
}

function applyDamageToEnemy(
  state: RunState,
  rawDmg: number,
  isPierce: boolean
): void {
  if (!Number.isFinite(rawDmg)) {
    if (!Number.isNaN(rawDmg) && rawDmg > 0) {
      if (!isPierce) state.enemyShield = 0;
      state.enemyHp = 0;
    }
    return;
  }
  let dmg = Math.max(1, Math.floor(rawDmg));
  if (!isPierce && state.enemyShield > 0) {
    const absorbed = Math.min(state.enemyShield, dmg);
    state.enemyShield -= absorbed;
    dmg -= absorbed;
  }
  state.enemyHp = Math.max(0, state.enemyHp - dmg);
}

export function playCardFromHand(
  prevState: RunState,
  cardInstanceId: string,
  role: CommandRole,
  save?: PlayerSaveData
): RunState {
  if (prevState.phase !== "battle") return prevState;
  if (role === "guard" && prevState.relicIds.includes("black_pact_solo")) {
    return prevState;
  }
  const cardIndex = prevState.hand.findIndex((c) => c.instanceId === cardInstanceId);
  if (cardIndex === -1) return prevState;

  const card = prevState.hand[cardIndex];
  const cost = getEffectiveCardCost(prevState, card);
  const hasOverclock = prevState.relicIds.includes("overclock");

  if (prevState.energy < cost && !hasOverclock) {
    return prevState;
  }

  const state: RunState = { ...prevState, logs: [...prevState.logs] };
  let rngStep = state.rngStep;
  const getRng = () => {
    const r = createSeededRng(state.rngSeed + rngStep * 7919);
    rngStep += 1;
    return r;
  };

  // Pay energy or HP via overclock
  let hpCost = 0;
  if (state.energy >= cost) {
    state.energy -= cost;
  } else {
    const shortage = cost - state.energy;
    state.energy = 0;
    hpCost = shortage * 4;
    const lost = applySelfHarm(state, hpCost);
    state.logs.unshift(`禁断の過積載：HPを ${lost} 削って発動！`);
  }
  state.energySpentThisTurn += cost;
  if (!state.attrsPlayedThisTurn.includes(card.attribute)) {
    state.attrsPlayedThisTurn = [...state.attrsPlayedThisTurn, card.attribute];
  }

  if (
    state.relicIds.includes("white_revelation_omega") &&
    card.rank === "SSR" &&
    cost === 0 &&
    !state.freeExtremeUsedThisTurn
  ) {
    state.freeExtremeUsedThisTurn = true;
  }
  if (
    state.relicIds.includes("tsune_resonator") &&
    state.highRankCostDiscountThisTurn > 0 &&
    (card.rank === "SR" || card.rank === "SSR" || card.rank === "UR")
  ) {
    state.highRankCostDiscountThisTurn = 0;
  }
  if (
    state.relicIds.includes("zero_cost_engine") &&
    cost === 0 &&
    state.zeroCostTriggersThisTurn < 3
  ) {
    state.zeroCostTriggersThisTurn += 1;
    state.energy += 1;
    state.battleMult *= 1.25;
  }
  if (state.relicIds.includes("blood_ink_pact")) {
    applySelfHarm(state, 5);
  }
  if (state.relicIds.includes("empty_pocket") && state.energy === 0) {
    state.battleMult = state.battleMult * 1.45;
  }

  // Remove played card from hand -> playedThisTurn (prevent infinite same-turn reshuffle!)
  let nextHand = [...state.hand];
  nextHand.splice(cardIndex, 1);
  let nextDraw = [...state.drawPile];
  let nextDiscard = [...state.discardPile];
  const nextPlayedThisTurn = [...state.playedThisTurn, card];

  const handLimit = getHandLimit(state.relicIds);
  const hasWhiteBlank = state.relicIds.includes("white_revelation_blank");
  const isPureNoFDeck =
    state.relicIds.includes("white_revelation_pure") &&
    !state.deck.some((c) => c.rank === "F") &&
    (card.rank === "N" || card.rank === "R");
  const isRhythmBeat =
    state.relicIds.includes("white_revelation_rhythm") &&
    (state.totalCardsPlayedInRun + 1) % 5 === 0;

  // Determine retrigger count (capped cleanly at 12 so multiplicative chains 2*2=4 feel great without freezing)
  let retriggers = 1 + state.nextCardRetrigger;
  state.nextCardRetrigger = 0;

  if (state.relicIds.includes("yamabiko") && state.cardsPlayedThisTurn === 0) {
    retriggers += 1;
  }
  if (state.relicIds.includes("black_pact_echo")) {
    retriggers += 2;
  }
  if (state.relicIds.includes("black_pact_rot")) {
    retriggers += 1;
  }
  if (
    state.relicIds.includes("black_pact_truncate") &&
    role === "attack" &&
    state.attacksPlayedThisTurn === 0
  ) {
    retriggers += 2;
  }
  if (state.relicIds.includes("black_pact_blitz") && state.turn <= 2) {
    retriggers += 1;
  }
  if (state.relicIds.includes("white_revelation_omega")) {
    retriggers += 1;
  }
  if (state.relicIds.includes("white_revelation_foresight") && state.turn === 1) {
    retriggers += 1;
  }
  if (isPureNoFDeck) {
    retriggers += 1;
  }
  if (isRhythmBeat) {
    retriggers += 1;
  }

  const plusBonus = Math.max(0, card.plusLevel) * PLUS_STAT_STEP;
  const rawBase =
    (role === "guard" ? card.baseDef : card.baseAtk) + plusBonus;

  if (state.relicIds.includes("kensan_wedge") && rawBase >= 80) {
    retriggers += 1;
  }
  if (
    state.relicIds.includes("desperate_bell") &&
    state.playerHp <= state.playerMaxHp * 0.5
  ) {
    retriggers += 1;
  }
  if (state.relicIds.includes("minimalist_art") && state.deck.length <= 10) {
    retriggers += 1;
  }
  const isWeakBaseCard = card.baseAtk <= 30 && card.baseDef <= 30;
  if (state.relicIds.includes("jakusha_reversal") && isWeakBaseCard) {
    retriggers += 1;
  }
  const hasBrokenBlade = state.relicIds.includes("broken_blade_rust");
  if (hasBrokenBlade && (card.rank === "N" || card.rank === "R")) {
    retriggers += 1;
  }
  retriggers = Math.min(12, retriggers);

  let totalDamageThisAction = 0;
  let totalShieldThisAction = 0;
  let lastBreakdown: OutputBreakdown | null = null;

  const hasLotus = state.relicIds.includes("deichu_hasu");
  const hasSnowball = state.relicIds.includes("yukidaruma");
  const hasYoji = state.relicIds.includes("yoji_curse");
  const hasTwoKanji = state.relicIds.includes("two_kanji_blade");
  const hasKyokuten = state.relicIds.includes("kyokuten_art");
  const hasBlackDouble = state.relicIds.includes("black_pact_double");
  const hasBlackBloodwrite = state.relicIds.includes("black_pact_bloodwrite");
  const hasBlackSolo = state.relicIds.includes("black_pact_solo");
  const hasBlackHeavy = state.relicIds.includes("black_pact_heavy");
  const hasBlackBlitz = state.relicIds.includes("black_pact_blitz");
  const hasBlackRot = state.relicIds.includes("black_pact_rot");
  const hasWhiteApex = state.relicIds.includes("white_revelation_apex");
  const hasTsuneRebel = state.relicIds.includes("tsune_rebel");
  const hasEmotionDetonator = state.relicIds.includes("emotion_detonator");
  const hasLogicWall = state.relicIds.includes("logic_shield_core");
  const hasHeavyGravity = state.relicIds.includes("heavy_gravity");
  const hasSenpenBanka = state.relicIds.includes("senpen_banka");
  const hasWhiteLibrary = state.relicIds.includes("white_revelation_library");
  const hasEmeraldEcho = state.relicIds.includes("emerald_echo");
  const hasIronWallArt = state.relicIds.includes("iron_wall_art");
  const hasAbundantDeck = state.relicIds.includes("abundant_deck");
  const hasMinimalistArt = state.relicIds.includes("minimalist_art");
  const hasDesperateBell = state.relicIds.includes("desperate_bell");
  const hasTsuneResonator = state.relicIds.includes("tsune_resonator");
  const hasJakusha = state.relicIds.includes("jakusha_reversal");

  if (hasTsuneResonator && card.rank === "N") {
    state.highRankCostDiscountThisTurn += 1;
  }
  if (state.relicIds.includes("rank_staircase")) {
    if (card.rank === "N" && state.staircaseStep === 0) {
      state.staircaseStep = 1;
    } else if (card.rank === "R" && state.staircaseStep === 1) {
      state.staircaseStep = 2;
    } else if (
      (card.rank === "SR" || card.rank === "SSR" || card.rank === "UR") &&
      state.staircaseStep === 2
    ) {
      state.staircaseStep = 3;
      state.permanentMultBonus = Number((state.permanentMultBonus + 0.5).toFixed(2));
      state.battleMult = state.battleMult * 3.0;
      state.nextCardRetrigger = Math.min(4, state.nextCardRetrigger + 1);
      state.logs.unshift("階梯の詠唱（永続）発動！永続初期乗算 +0.5 ＆ 戦闘乗算 ×3.0 ＆ 次カード再発動+1！");
    }
  }

  const isFourKanji = /^[\u4e00-\u9faf]{4,}$/.test(card.term);
  const isTwoKanji = /^[\u4e00-\u9faf]{2}$/.test(card.term);
  const fCardsCount = [...nextHand, ...nextDraw, ...nextDiscard, ...nextPlayedThisTurn].filter(
    (c) => c.rank === "F"
  ).length;
  const handCountAtPlay = prevState.hand.length;

  const isFInverted = card.rank === "F" && state.nextFInverted;
  const fInvertMultVal = isFInverted ? Math.max(2, state.nextFInvertMult) : 1;
  if (isFInverted) {
    state.nextFInverted = false;
    state.nextFInvertMult = 1;
  }
  const attackBuffMult = role === "attack" ? state.nextAttackMult : 1;
  const attackBuffFlat = role === "attack" ? state.nextAttackFlatAdd : 0;
  if (role === "attack") {
    state.nextAttackMult = 1;
    state.nextAttackFlatAdd = 0;
  }

  for (let r = 0; r < retriggers; r++) {
    // 1. On-play relic triggers (draws and retrigger grants trigger once on r === 0)
    if (hasSnowball && state.lastAttrPlayed === card.attribute) {
      state.battleMult *= 1.5;
    }
    if (hasYoji && isFourKanji) {
      state.battleMult *= 2.0;
    }
    if (hasTwoKanji && isTwoKanji) {
      state.permanentFlatAdd += 35;
      state.battleFlatAdd += 35;
      state.battleMult *= 1.4;
    }
    if (hasKyokuten && (card.rank === "SSR" || card.rank === "UR")) {
      state.battleMult *= 2.2;
    }
    if (hasHeavyGravity && card.cost >= 3) {
      state.permanentFlatAdd += 150;
      state.battleFlatAdd += 150;
      state.battleMult *= 1.8;
    }
    if (hasWhiteApex) {
      state.battleExponent = Number((state.battleExponent + 0.008).toFixed(3));
    }
    if (hasBlackBloodwrite && r === 0) {
      state.permanentFlatAdd += 80;
      state.battleFlatAdd += 80;
      state.battleMult *= 1.25;
    }
    if (
      hasBlackHeavy &&
      r === 0 &&
      (card.rank === "SSR" || card.rank === "UR")
    ) {
      state.battleExponent = Number((state.battleExponent + 0.035).toFixed(3));
      state.battleMult *= 2.2;
    }
    if (isPureNoFDeck) {
      state.battleMult *= 1.25;
    }
    if (isRhythmBeat && r === 0) {
      state.permanentFlatAdd += 80;
      state.battleFlatAdd += 80;
    }
    if (hasTsuneRebel && card.rank === "N" && r === 0) {
      const drawnRes = drawIntoHand(
        nextDraw,
        nextDiscard,
        nextHand,
        1,
        getRng(),
        handLimit,
        hasWhiteBlank
      );
      nextDraw = drawnRes.nextDraw;
      nextDiscard = drawnRes.nextDiscard;
      nextHand = drawnRes.nextHand;
    }
    if (hasTsuneResonator && card.rank === "N") {
      state.battleMult *= 1.3;
    }
    if (hasJakusha && isWeakBaseCard) {
      state.permanentFlatAdd += 45;
      state.battleFlatAdd += 45;
    }
    if (hasWhiteLibrary && role === "skill") {
      state.battleMult *= 1.2;
      if (r === 0 && (state.librarySkillDrawsThisTurn ?? 0) < 3) {
        state.librarySkillDrawsThisTurn = (state.librarySkillDrawsThisTurn ?? 0) + 1;
        const drawnRes = drawIntoHand(
          nextDraw,
          nextDiscard,
          nextHand,
          1,
          getRng(),
          handLimit,
          hasWhiteBlank
        );
        nextDraw = drawnRes.nextDraw;
        nextDiscard = drawnRes.nextDiscard;
        nextHand = drawnRes.nextHand;
      }
    }
    if (hasEmeraldEcho && card.attribute === "sense" && r === 0) {
      state.enemyWeakenPct = Math.min(75, state.enemyWeakenPct + 15);
      state.nextCardRetrigger = Math.min(11, state.nextCardRetrigger + 1);
    }

    // 2. Role & attribute bonuses
    let attrMult = 1;
    if (role === "attack" && (card.attribute === "emotion" || card.attribute === "sense")) {
      attrMult = 1.25;
    }
    if (role === "guard" && (card.attribute === "logic" || card.attribute === "matter")) {
      attrMult = 1.25;
    }
    if (hasEmotionDetonator && role === "attack" && card.attribute === "emotion") {
      state.permanentFlatAdd += 40;
      state.battleFlatAdd += 40;
      state.battleMult *= 1.35;
    }

    // F-rank handling
    let fMult = 1;
    if (card.rank === "F") {
      if (isFInverted) {
        fMult = fInvertMultVal;
      } else if (!hasLotus && !hasWhiteBlank) {
        if (r === 0) applySelfHarm(state, 3);
        attrMult = 0.6;
      } else if (hasLotus && fCardsCount > 0) {
        fMult = Math.pow(1.8, Math.min(6, fCardsCount));
      }
    } else if (hasLotus && fCardsCount > 0) {
      fMult = Math.pow(1.8, Math.min(6, fCardsCount));
    }

    const pactBaseMult =
      (hasBlackDouble ? 3.2 : 1) *
      (hasBlackRot ? 2.2 : 1) *
      (hasBlackBlitz ? (state.turn <= 2 ? 4.0 : 0.5) : 1) *
      (hasBlackSolo && role === "attack" ? 3.5 : 1) *
      (isRhythmBeat ? 2.5 : 1);
    const abundantFlatAdd = hasAbundantDeck ? state.deck.length * 15 : 0;
    const fBlessingCopies = state.relicIds.filter(
      (id) => id === "blessing_f_2000"
    ).length;
    const fBlessingFlatAdd =
      fBlessingCopies > 0 ? fCardsCount * 200 * fBlessingCopies : 0;
    const abundantMult = hasAbundantDeck ? 1 + state.deck.length * 0.1 : 1;
    const minimalistMult = hasMinimalistArt && state.deck.length <= 10 ? 2.5 : 1;
    const senpenMult = hasSenpenBanka && handCountAtPlay >= 6 ? 2.5 : 1;
    const desperateMult =
      hasDesperateBell && state.playerHp <= state.playerMaxHp * 0.5 ? 3.0 : 1;
    const chainTurnMult =
      state.cardsPlayedThisTurn >= 2 ? 1 + (state.cardsPlayedThisTurn - 1) * 0.2 : 1;
    const brokenBladeMult = hasBrokenBlade
      ? card.rank === "N" || card.rank === "R"
        ? 2.0
        : card.rank === "SSR" || card.rank === "UR"
          ? 0.5
          : 1
      : 1;

    const baseOutput =
      (rawBase +
        state.battleFlatAdd +
        abundantFlatAdd +
        fBlessingFlatAdd +
        attackBuffFlat) *
      pactBaseMult;
    const combinedMult = Math.max(
      0.5,
      state.battleMult *
        state.nextCardMult *
        attackBuffMult *
        attrMult *
        fMult *
        abundantMult *
        minimalistMult *
        senpenMult *
        desperateMult *
        chainTurnMult *
        brokenBladeMult
    );
    const scaledMult = Math.pow(combinedMult, state.battleExponent);
    const rawOutputValue = baseOutput * scaledMult;
    const outputValue = Number.isNaN(rawOutputValue)
      ? 1
      : Number.isFinite(rawOutputValue)
        ? Math.max(1, Math.floor(rawOutputValue))
        : Infinity;

    // Defense scaling stays isolated from offensive multipliers/exponents, while scaling sustainably into Endless
    const guardPactEchoMult = state.relicIds.includes("black_pact_echo") ? 0.5 : 1;
    const guardFMult = card.rank === "F" && isFInverted ? fInvertMultVal : 1;
    const guardMult = Number(
      (attrMult * guardFMult * guardPactEchoMult * brokenBladeMult).toFixed(2)
    );
    const guardSustainedBase =
      rawBase +
      Math.floor(Math.sqrt(Math.max(0, state.permanentFlatAdd)) * 1.8) +
      Math.floor(state.playerMaxHp * 0.06);

    if (role === "attack") {
      // Consume nextCardMult on first attack trigger
      state.nextCardMult = 1;

      // Enemy tactical defenses against heavy / single-card spam
      let enemyDefenseMult = 1;
      if (state.enemy.gimmickType === "combo_armor") {
        enemyDefenseMult *= state.cardsPlayedThisTurn < 3 ? 0.55 : 1.4;
      }
      if (state.enemy.gimmickType === "heavy_dampen" && card.cost >= 2) {
        enemyDefenseMult *= 0.6;
      }
      if (hasBlackSolo && enemyDefenseMult < 1) {
        enemyDefenseMult = 1;
      }

      // Pierce or normal shield absorption
      const isPierce =
        card.attribute === "logic" && (card.rank === "SSR" || card.rank === "UR");
      const rawEffective = outputValue * enemyDefenseMult;
      const effectiveAttackOutput = Number.isFinite(rawEffective)
        ? Math.max(1, Math.floor(rawEffective))
        : Infinity;
      applyDamageToEnemy(state, effectiveAttackOutput, isPierce);
      totalDamageThisAction += effectiveAttackOutput;
    } else if (role === "guard") {
      const shieldGain = Math.max(1, Math.floor(guardSustainedBase * guardMult));
      state.playerShield += shieldGain;
      totalShieldThisAction += shieldGain;
      if (hasLogicWall) {
        state.battleMult *= 1.25;
      }
      if (hasIronWallArt && card.attribute === "matter") {
        state.permanentFlatAdd += 80;
        state.battleFlatAdd += 80;
        state.battleMult *= 1.3;
      }
    } else {
      // SKILL execution (draw / energy / weaken / retrigger grants run once on r === 0 to stop infinite loops!)
      switch (card.skillType) {
        case "draw": {
          if (r === 0) {
            const res = drawIntoHand(
              nextDraw,
              nextDiscard,
              nextHand,
              card.skillPower,
              getRng(),
              handLimit,
              hasWhiteBlank
            );
            nextDraw = res.nextDraw;
            nextDiscard = res.nextDiscard;
            nextHand = res.nextHand;
          }
          break;
        }
        case "energy":
          if (r === 0) {
            state.energy += card.skillPower;
          }
          break;
        case "mult_next":
          state.nextCardMult *= card.skillPower;
          break;
        case "mult_battle":
          state.battleMult *= card.skillPower;
          break;
        case "retrigger_next":
          if (r === 0) {
            // Multiplicative stacking: e.g., 2x activation -> +1 (2x) yields 2*2 = 4 activations!
            const nextTotalActivations = retriggers * (1 + card.skillPower);
            state.nextCardRetrigger = Math.min(
              11,
              state.nextCardRetrigger + (nextTotalActivations - 1)
            );
          }
          break;
        case "weaken":
          if (r === 0) {
            state.enemyWeakenPct = Math.min(75, state.enemyWeakenPct + card.skillPower);
          }
          break;
        case "pierce_burst": {
          state.battleMult = state.battleMult * card.skillPower;
          let burstDefenseMult = 1;
          if (state.enemy.gimmickType === "combo_armor") {
            burstDefenseMult *= state.cardsPlayedThisTurn < 3 ? 0.55 : 1.4;
          }
          if (state.enemy.gimmickType === "heavy_dampen" && card.cost >= 2) {
            burstDefenseMult *= 0.6;
          }
          const rawBurst =
            (rawBase + state.battleFlatAdd) *
            Math.pow(state.battleMult, state.battleExponent) *
            burstDefenseMult;
          const burstDmg = Number.isNaN(rawBurst)
            ? 1
            : Number.isFinite(rawBurst)
              ? Math.max(1, Math.floor(rawBurst))
              : Infinity;
          applyDamageToEnemy(state, burstDmg, true);
          totalDamageThisAction += burstDmg;
          break;
        }
        case "chaos_curse":
          if (r === 0 && !hasLotus && !isFInverted) {
            applySelfHarm(state, 3);
          }
          state.nextCardMult *= isFInverted
            ? card.skillPower * fInvertMultVal
            : card.skillPower;
          break;
        case "english_link": {
          const engInHand = nextHand.filter((c) =>
            /^[A-Za-z][A-Za-z0-9-]*$/.test(c.term)
          ).length;
          state.battleMult = state.battleMult + card.skillPower * (engInHand + 1);
          if (r === 0) {
            const res = drawIntoHand(
              nextDraw,
              nextDiscard,
              nextHand,
              1,
              getRng(),
              handLimit,
              hasWhiteBlank
            );
            nextDraw = res.nextDraw;
            nextDiscard = res.nextDiscard;
            nextHand = res.nextHand;
          }
          break;
        }
        case "english_discount":
          if (r === 0) {
            state.allCardCostDiscountThisTurn = Math.min(
              3,
              state.allCardCostDiscountThisTurn + 1
            );
          }
          state.permanentFlatAdd += card.skillPower;
          state.battleFlatAdd += card.skillPower;
          break;
        case "english_purge": {
          if (r === 0) {
            const purgeFromPile = (pile: BattleCard[]): BattleCard | null => {
              const idx = pile.findIndex((c) => c.rank === "F");
              if (idx === -1) return null;
              return pile.splice(idx, 1)[0];
            };
            const purged =
              purgeFromPile(nextHand) ??
              purgeFromPile(nextDraw) ??
              purgeFromPile(nextDiscard);
            if (purged) {
              state.logs.unshift(
                `英語浄化：『不：${purged.term}』をこの戦闘から除外した！`
              );
            }
          }
          state.battleMult = state.battleMult * card.skillPower;
          break;
        }
        case "desperation_mult":
          if (r === 0 && state.playerHp <= state.playerMaxHp * 0.3) {
            state.nextAttackMult *= card.skillPower;
          }
          break;
        case "sacrifice_mult":
          if (r === 0) {
            const sacLoss = Math.max(1, Math.floor(state.playerHp * 0.5));
            const actual = applySelfHarm(state, sacLoss);
            state.nextAttackMult *= card.skillPower;
            state.logs.unshift(`生贄：HPを ${actual} 捧げ、次攻撃 ×${card.skillPower}！`);
          }
          break;
        case "vengeance_flat":
          if (r === 0) {
            const bonus = state.selfHarmHpTotalInBattle * card.skillPower;
            state.nextAttackFlatAdd += bonus;
            state.logs.unshift(`復讐：次攻撃の基礎値 +${bonus}！`);
          }
          break;
        case "f_resonance":
          if (r === 0) {
            const handF = Math.min(
              6,
              nextHand.filter((c) => c.rank === "F").length
            );
            if (handF > 0) {
              state.battleMult = state.battleMult * Math.pow(card.skillPower, handF);
            }
          }
          break;
        case "f_invert":
          if (r === 0) {
            state.nextFInverted = true;
            state.nextFInvertMult = card.skillPower;
          }
          break;
        case "f_sacrifice":
          if (r === 0) {
            const fIdx = nextHand.findIndex((c) => c.rank === "F");
            if (fIdx !== -1) {
              const sacrificed = nextHand.splice(fIdx, 1)[0];
              state.nextAttackMult *= card.skillPower;
              state.logs.unshift(
                `不の犠牲：『${sacrificed.term}』を戦闘除外し、次攻撃 ×${card.skillPower}！`
              );
            }
          }
          break;
        case "curse_stack":
          if (r === 0 && state.selfHarmCountInBattle > 0) {
            const stacks = Math.min(12, state.selfHarmCountInBattle);
            state.battleMult = state.battleMult * Math.pow(card.skillPower, stacks);
          }
          break;
        case "moroha_edge":
          if (r === 0) {
            state.nextAttackMult *= card.skillPower;
            state.pendingSelfHarmPctAfterAttack = Math.min(
              30,
              state.pendingSelfHarmPctAfterAttack + 10
            );
          }
          break;
        case "accumulate_cards":
          if (r === 0 && state.totalCardsPlayedInBattle > 0) {
            const stacks = Math.min(15, state.totalCardsPlayedInBattle);
            state.nextAttackMult *= Math.pow(card.skillPower, stacks);
          }
          break;
        case "skill_chain":
          if (r === 0 && state.skillsPlayedThisTurn > 0) {
            const stacks = Math.min(10, state.skillsPlayedThisTurn);
            state.nextAttackMult *= Math.pow(card.skillPower, stacks);
          }
          break;
        case "cost_amp":
          if (r === 0 && state.energySpentThisTurn > 0) {
            const stacks = Math.min(12, state.energySpentThisTurn);
            state.nextAttackMult *= Math.pow(card.skillPower, stacks);
          }
          break;
        case "diversity_mult":
          if (r === 0) {
            state.battleMult =
              state.battleMult + state.attrsPlayedThisTurn.length * card.skillPower;
          }
          break;
        case "guard_stock":
          if (r === 0 && state.guardsPlayedInBattle > 0) {
            const capped = Math.min(16, state.guardsPlayedInBattle);
            state.nextAttackMult *= 1 + capped * card.skillPower;
          }
          break;
        case "mimic_last":
          if (r === 0 && state.lastCombatAction) {
            const rawMimic = state.lastCombatAction.output * card.skillPower;
            const mimicOut = Number.isFinite(rawMimic)
              ? Math.max(1, Math.floor(rawMimic))
              : Infinity;
            if (state.lastCombatAction.role === "attack") {
              applyDamageToEnemy(state, mimicOut, false);
              totalDamageThisAction += mimicOut;
              state.logs.unshift(
                `模倣再現！直前攻撃の50%（${formatJapaneseNumber(mimicOut).text} DMG）！`
              );
            } else {
              state.playerShield += mimicOut;
              totalShieldThisAction += mimicOut;
              state.logs.unshift(
                `模倣再現！直前防御の50%（盾 +${formatJapaneseNumber(mimicOut).text}）！`
              );
            }
          }
          break;
        case "pursuit_combo":
          if (r === 0 && state.attacksPlayedThisTurn > 0) {
            state.nextCardRetrigger = Math.min(
              11,
              state.nextCardRetrigger + state.attacksPlayedThisTurn * card.skillPower
            );
          }
          break;
        case "self_harm_mult":
          if (r === 0 && state.selfHarmHpTotalInBattle > 0) {
            state.battleMult =
              state.battleMult + state.selfHarmHpTotalInBattle * card.skillPower;
          }
          break;
      }

      if (card.subSkill) {
        switch (card.subSkill.type) {
          case "draw": {
            if (r === 0) {
              const subDraw = drawIntoHand(
                nextDraw,
                nextDiscard,
                nextHand,
                card.subSkill.power,
                getRng(),
                handLimit,
                hasWhiteBlank
              );
              nextDraw = subDraw.nextDraw;
              nextDiscard = subDraw.nextDiscard;
              nextHand = subDraw.nextHand;
            }
            break;
          }
          case "energy":
            if (r === 0) {
              state.energy += card.subSkill.power;
            }
            break;
          case "mult_next":
            state.nextCardMult *= card.subSkill.power;
            break;
          case "mult_battle":
            state.battleMult *= card.subSkill.power;
            break;
          case "weaken":
            if (r === 0) {
              state.enemyWeakenPct = Math.min(
                75,
                state.enemyWeakenPct + card.subSkill.power
              );
            }
            break;
          case "retrigger_next":
            if (r === 0) {
              const nextTotalActivations = retriggers * (1 + card.subSkill.power);
              state.nextCardRetrigger = Math.min(
                11,
                state.nextCardRetrigger + (nextTotalActivations - 1)
              );
            }
            break;
        }
      }
    }

    lastBreakdown = {
      baseOutput: role === "guard" ? Math.floor(rawBase) : Math.floor(baseOutput),
      flatAdd: role === "guard" ? 0 : state.battleFlatAdd,
      multiplier:
        role === "guard"
          ? guardMult
          : role === "skill" && card.skillType === "pierce_burst"
            ? state.battleMult
            : combinedMult,
      exponent: role === "guard" ? 1 : state.battleExponent,
      retriggers,
      finalOutput:
        role === "attack" || totalDamageThisAction > 0
          ? totalDamageThisAction
          : role === "guard" || totalShieldThisAction > 0
            ? totalShieldThisAction
            : Math.floor(scaledMult),
      role,
      cardTerm: card.term,
      didDamage: totalDamageThisAction > 0,
      didShield: totalShieldThisAction > 0,
    };

    state.lastAttrPlayed = card.attribute;
  }

  if (role === "attack" && state.pendingSelfHarmPctAfterAttack > 0) {
    const morohaLoss = Math.max(
      1,
      Math.floor((state.playerMaxHp * state.pendingSelfHarmPctAfterAttack) / 100)
    );
    const actual = applySelfHarm(state, morohaLoss);
    state.pendingSelfHarmPctAfterAttack = 0;
    state.logs.unshift(`諸刃の反動！HPを ${actual} 失った！`);
  }
  if (role === "attack") {
    state.attacksPlayedThisTurn += 1;
    state.lastCombatAction = { role: "attack", output: totalDamageThisAction };
  } else if (role === "guard") {
    state.guardsPlayedInBattle += 1;
    state.lastCombatAction = { role: "guard", output: totalShieldThisAction };
  } else {
    state.skillsPlayedThisTurn += 1;
    if (totalDamageThisAction > 0 && card.skillType !== "mimic_last") {
      state.lastCombatAction = { role: "attack", output: totalDamageThisAction };
    }
  }

  // 白き天啓：言霊の環 (3+ attrs in one turn -> energy+2, draw 2, permanent mult x1.15)
  if (
    state.relicIds.includes("white_revelation_ring") &&
    !state.whiteRingTriggeredThisTurn &&
    state.attrsPlayedThisTurn.length >= 3
  ) {
    state.whiteRingTriggeredThisTurn = true;
    state.energy += 2;
    state.permanentMultBonus = Number((state.permanentMultBonus * 1.15).toFixed(3));
    state.battleMult = state.battleMult * 1.15;
    const ringDraw = drawIntoHand(
      nextDraw,
      nextDiscard,
      nextHand,
      2,
      getRng(),
      handLimit,
      hasWhiteBlank
    );
    nextDraw = ringDraw.nextDraw;
    nextDiscard = ringDraw.nextDiscard;
    nextHand = ringDraw.nextHand;
    state.logs.unshift("言霊の環発動！コスト+2・2枚ドロー ＆ 永続乗算 ×1.15！");
  }

  state.hand = nextHand;
  state.drawPile = nextDraw;
  state.discardPile = nextDiscard;
  state.playedThisTurn = nextPlayedThisTurn;
  state.cardsPlayedThisTurn += 1;
  state.totalCardsPlayedInBattle += 1;
  state.totalCardsPlayedInRun += 1;

  // Four Elements harmony check
  if (!state.attrsPlayedThisBattle.includes(card.attribute)) {
    state.attrsPlayedThisBattle = [...state.attrsPlayedThisBattle, card.attribute];
  }
  if (
    state.relicIds.includes("four_elements") &&
    !state.fourElementsTriggeredThisBattle &&
    state.attrsPlayedThisBattle.length >= 4
  ) {
    state.fourElementsTriggeredThisBattle = true;
    state.battleMult = state.battleMult * 3.5;
    state.permanentExponentBonus = Number((state.permanentExponentBonus + 0.03).toFixed(3));
    state.battleExponent = Number((state.battleExponent + 0.2).toFixed(3));
    state.logs.unshift(
      `四属性の調和発動！戦闘乗算×3.5・戦闘指数+0.2 ＆ 永続指数+0.03（現在 ^${state.battleExponent}）`
    );
  }

  // 一気呵成 (4th card in turn)
  if (state.relicIds.includes("ikkikasei") && state.cardsPlayedThisTurn === 4) {
    state.battleMult = state.battleMult * 2.5;
    state.nextCardRetrigger = Math.min(11, state.nextCardRetrigger + 1);
    state.logs.unshift("一気呵成発動！乗算×2.5 ＆ 次カード再発動+1！");
  }

  // 天元の方程式 (Persistent across run: every 6 cards played adds +2 to permanent start multiplier!)
  if (
    state.relicIds.includes("tengen_equation") &&
    state.totalCardsPlayedInRun % 6 === 0
  ) {
    const prevTengen =
      state.tengenPermanentMult <= 1 ? 0 : state.tengenPermanentMult;
    state.tengenPermanentMult = prevTengen + 2;
    state.battleMult = state.battleMult + 2;
    state.logs.unshift(
      `天元の方程式（永続）発動！永続乗算 ×${formatJapaneseNumber(state.tengenPermanentMult).text}（6枚達成×2）に到達！`
    );
  }

  // 対数の螺旋 (Every 12 cards across run -> permanent exponent +0.02)
  if (
    state.relicIds.includes("logarithm_spiral") &&
    state.totalCardsPlayedInRun % 12 === 0
  ) {
    state.permanentExponentBonus = Number((state.permanentExponentBonus + 0.02).toFixed(3));
    state.battleExponent = Number((state.battleExponent + 0.02).toFixed(3));
    state.logs.unshift(
      `対数の螺旋発動！永続指数 +0.02（現在 ^${state.battleExponent}）`
    );
  }

  state.rngStep = rngStep;
  state.lastOutput = lastBreakdown;

  if (totalDamageThisAction > state.maxDamageDealt) {
    state.maxDamageDealt = totalDamageThisAction;
  }

  const formattedDmg = formatJapaneseNumber(totalDamageThisAction).text;
  const formattedDef = formatJapaneseNumber(totalShieldThisAction).text;
  const retriggerLabel = retriggers > 1 ? `（${retriggers}連発動！）` : "";

  if (role === "attack") {
    state.logs.unshift(`『${card.term}』で攻撃！ ${formattedDmg} ダメージ${retriggerLabel}`);
  } else if (role === "guard") {
    state.logs.unshift(`『${card.term}』で防御！ 盾 +${formattedDef}${retriggerLabel}`);
  } else if (totalDamageThisAction > 0) {
    state.logs.unshift(
      `『${card.term}』スキル発動！ ${formattedDmg} ダメージ（${card.skillDesc}）${retriggerLabel}`
    );
  } else if (totalShieldThisAction > 0) {
    state.logs.unshift(
      `『${card.term}』スキル発動！ 盾 +${formattedDef}（${card.skillDesc}）${retriggerLabel}`
    );
  } else {
    state.logs.unshift(`『${card.term}』スキル発動！ ${card.skillDesc}${retriggerLabel}`);
  }
  state.logs = state.logs.slice(0, 20);

  // Check Victory!
  if (state.enemyHp <= 0) {
    return handleEnemyDefeated(state, save);
  }

  return state;
}

function handleEnemyDefeated(prev: RunState, save?: PlayerSaveData): RunState {
  const state = { ...prev, logs: [...prev.logs] };
  state.logs.unshift(`${state.enemy.name} を撃破した！`);

  if (state.relicIds.includes("life_spell")) {
    state.playerMaxHp += 6;
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + 18);
    state.logs.unshift("生命の綴り：最大HP +6、HP 18 回復！");
  }

  // Check if stage boss defeated (and not yet in endless)
  if (!state.isEndless && state.floor >= state.totalStageFloors) {
    state.phase = "stage_clear";
    return state;
  }

  return {
    ...buildCardRewardsForRun(state, save),
    phase: "reward_card",
  };
}

function buildRandomCardRewards(
  state: RunState,
  save?: PlayerSaveData
): RunState {
  let rngStep = state.rngStep;
  const rng = createSeededRng(state.rngSeed + rngStep * 7919);
  rngStep += 1;

  const style = state.randomStyle ?? "chaos";
  const allNonF = WORD_MASTER_LIST.filter((w) => w.rank !== "F");
  const stylePool =
    style === "chaos"
      ? allNonF
      : WORD_MASTER_LIST.filter((w) => matchesRandomStyle(w, style));
  const styledShuffled = shuffleWithRng(
    stylePool.length >= 2 ? stylePool : allNonF,
    rng
  );
  const fullShuffled = shuffleWithRng(WORD_MASTER_LIST, rng);

  const choices: BattleCard[] = [];
  const used = new Set<string>();
  const addChoice = (entry: WordMasterEntry, idx: number) => {
    used.add(entry.term);
    const isUnowned = save ? !save.ownedWords[entry.term] : true;
    choices.push(
      toBattleCard(entry, 0, `rand_rew_${state.floor}_${idx}`, isUnowned)
    );
  };

  for (const cand of styledShuffled) {
    if (choices.length >= 2) break;
    if (!used.has(cand.term)) addChoice(cand, choices.length);
  }
  for (const cand of fullShuffled) {
    if (choices.length >= 3) break;
    if (!used.has(cand.term)) addChoice(cand, choices.length);
  }

  return {
    ...state,
    cardChoices: choices,
    rngStep,
  };
}

function buildImpromptuCardRewards(state: RunState): RunState {
  let rngStep = state.rngStep;
  const rng = createSeededRng(state.rngSeed + rngStep * 7919);
  rngStep += 1;

  const pool = state.impromptuPool ?? [];
  if (pool.length === 0) {
    return buildRandomCardRewards(state);
  }

  const inDeckTerms = new Set(state.deck.map((c) => c.term));
  const unseen = shuffleWithRng(
    pool.filter((w) => !inDeckTerms.has(w.term)),
    rng
  );
  const seen = shuffleWithRng(pool, rng);
  const choices: BattleCard[] = [];
  const pickedTerms = new Set<string>();

  for (const entry of unseen) {
    if (choices.length >= 3) break;
    pickedTerms.add(entry.term);
    choices.push(
      toBattleCard(entry, 0, `imp_rew_${state.floor}_${choices.length}`, true)
    );
  }

  const upgradeBonus = state.floor >= 3 ? 3 : 2;
  for (const entry of seen) {
    if (choices.length >= 3) break;
    if (!pickedTerms.has(entry.term)) {
      pickedTerms.add(entry.term);
      choices.push(
        toBattleCard(
          entry,
          upgradeBonus,
          `imp_up_${state.floor}_${choices.length}`,
          true
        )
      );
    }
  }

  // If sentence had fewer than 3 distinct words, offer higher-upgraded variations of those words
  let dupIdx = 0;
  while (choices.length < 3) {
    const entry = seen[dupIdx % seen.length];
    choices.push(
      toBattleCard(
        entry,
        upgradeBonus + Math.floor(dupIdx / seen.length) + 1,
        `imp_extra_${state.floor}_${choices.length}`,
        true
      )
    );
    dupIdx += 1;
  }

  return {
    ...state,
    cardChoices: choices,
    rngStep,
  };
}

export function buildCardRewardsForRun(
  state: RunState,
  save?: PlayerSaveData
): RunState {
  if (state.runMode === "random") {
    return buildRandomCardRewards(state, save);
  }
  if (state.runMode === "impromptu") {
    return buildImpromptuCardRewards(state);
  }
  if (save) {
    return buildCardRewardsFromSave(state, save);
  }
  const rng = createSeededRng(state.rngSeed + state.rngStep * 7919);
  const shuffled = shuffleWithRng(WORD_MASTER_LIST, rng);
  return {
    ...state,
    cardChoices: shuffled
      .slice(0, 3)
      .map((c, i) => toBattleCard(c, 0, `rew_${state.floor}_${i}`, false)),
    rngStep: state.rngStep + 1,
  };
}

export function buildCardRewardsFromSave(
  state: RunState,
  save: PlayerSaveData
): RunState {
  let rngStep = state.rngStep;
  const rng = createSeededRng(state.rngSeed + rngStep * 7919);
  rngStep += 1;

  const ownedPool: (WordMasterEntry & { obtainCount?: number })[] = save.deckPoolTerms
    .map((t): (WordMasterEntry & { obtainCount?: number }) | undefined =>
      save.ownedWords[t] ?? getWordMaster(t)
    )
    .filter((x): x is WordMasterEntry & { obtainCount?: number } => Boolean(x));

  const fallbackPool: (WordMasterEntry & { obtainCount?: number })[] =
    ownedPool.length >= 3 ? ownedPool : WORD_MASTER_LIST;
  const shuffledOwned = shuffleWithRng(fallbackPool, rng);
  const choices: BattleCard[] = [];
  const used = new Set<string>();

  for (const pick of shuffledOwned) {
    if (choices.length >= 2) break;
    if (!used.has(pick.term)) {
      used.add(pick.term);
      choices.push(toBattleCard(pick, 0, `pool_${state.floor}_${choices.length}`, false));
    }
  }

  // 3rd slot: chance for unowned SR/SSR trial card (higher chance deeper in dungeon)
  const trialChance = state.floor >= 3 ? 0.35 : 0.2;
  const unownedRare = WORD_MASTER_LIST.filter(
    (w) => (w.rank === "SR" || w.rank === "SSR") && !save.ownedWords[w.term] && !used.has(w.term)
  );
  if (unownedRare.length > 0 && rng() < trialChance) {
    const trial = unownedRare[Math.floor(rng() * unownedRare.length)];
    choices.push(toBattleCard(trial, 0, `trial_${state.floor}`, true));
  } else {
    const extra = shuffledOwned.find((p) => !used.has(p.term));
    if (extra) {
      choices.push(toBattleCard(extra, 0, `pool_${state.floor}_3`, false));
    }
  }

  return {
    ...state,
    cardChoices: choices,
    rngStep,
  };
}

function drawTurnOpeningHand(
  drawPile: BattleCard[],
  discardPile: BattleCard[],
  relicIds: string[],
  desiredCount: number,
  noiseSuffix: string,
  rng: () => number
): { hand: BattleCard[]; nextDraw: BattleCard[]; nextDiscard: BattleCard[] } {
  const handLimit = getHandLimit(relicIds);
  const hasWhiteBlank = relicIds.includes("white_revelation_blank");
  const hasBlackDouble = relicIds.includes("black_pact_double");
  const maxDrawCapacity = hasBlackDouble ? Math.max(0, handLimit - 1) : handLimit;
  const drawTarget = Math.min(desiredCount, maxDrawCapacity);
  const res = drawIntoHand(
    drawPile,
    discardPile,
    [],
    drawTarget,
    rng,
    maxDrawCapacity,
    hasWhiteBlank
  );
  const hand = [...res.nextHand];
  if (hasBlackDouble) {
    const noise = getWordMaster("えっと");
    if (noise) {
      hand.push(toBattleCard(noise, 0, noiseSuffix));
    }
  }
  return { hand, nextDraw: res.nextDraw, nextDiscard: res.nextDiscard };
}

export function endPlayerTurn(prev: RunState): RunState {
  if (prev.phase !== "battle") return prev;
  const state: RunState = { ...prev, logs: [...prev.logs] };
  let rngStep = state.rngStep;
  const getRng = () => {
    const r = createSeededRng(state.rngSeed + rngStep * 7919);
    rngStep += 1;
    return r;
  };

  // Black Pact bloodwrite: leftover cards in hand deal 8% current HP self-harm each (min HP 1)
  if (state.relicIds.includes("black_pact_bloodwrite") && state.hand.length > 0) {
    const rawLoss = Math.max(1, Math.floor(state.playerHp * 0.08 * state.hand.length));
    const lost = applySelfHarm(state, rawLoss);
    if (lost > 0) {
      state.logs.unshift(
        `血文字の呪縛：残手札${state.hand.length}枚によりHP -${lost}（最低HP1）`
      );
    }
  }

  // Execute enemy intent
  const intent = getEnemyCurrentIntent(state);
  const nextDiscard = [...state.discardPile, ...state.hand, ...state.playedThisTurn];
  const nextDraw = [...state.drawPile];
  state.playedThisTurn = [];

  switch (intent.type) {
    case "attack":
    case "heavy_attack": {
      let dmg = intent.value;
      const absorbed = Math.min(state.playerShield, dmg);
      state.playerShield -= absorbed;
      dmg -= absorbed;
      state.playerHp = Math.max(0, state.playerHp - dmg);
      state.logs.unshift(
        `${state.enemy.name} の ${intent.label}！（盾吸収 ${absorbed} / 実ダメージ ${dmg}）`
      );
      break;
    }
    case "defend":
      state.enemyShield += intent.value;
      state.logs.unshift(`${state.enemy.name} がシールド +${intent.value} を展開！`);
      break;
    case "buff":
      state.enemyAtkBonus += intent.value;
      state.logs.unshift(`${state.enemy.name} の攻撃力が +${intent.value} 上昇！`);
      break;
    case "curse_f": {
      if (state.relicIds.includes("white_revelation_pure")) {
        state.logs.unshift("無垢なる刃が『不』混入妨害を無効化した！");
        break;
      }
      const curseWord = getWordMaster("やばい")!;
      for (let i = 0; i < intent.value; i++) {
        nextDiscard.push(toBattleCard(curseWord, 0, `curse_${state.turn}_${i}`));
      }
      state.logs.unshift(
        `${state.enemy.name} の妨害！山札に『不：やばい』が ${intent.value} 枚混入！`
      );
      break;
    }
  }

  if (state.playerHp <= 0) {
    state.phase = "gameover";
    state.hand = [];
    state.discardPile = nextDiscard;
    state.drawPile = nextDraw;
    state.rngStep = rngStep;
    return state;
  }

  // White Serene: heal 15% MaxHP at end of turn
  if (
    state.relicIds.includes("white_revelation_serene") &&
    !state.relicIds.includes("black_pact_ascetic")
  ) {
    const sereneHeal = Math.max(1, Math.floor(state.playerMaxHp * 0.15));
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + sereneHeal);
    state.logs.unshift(`常世の静謐：HPを ${sereneHeal} 回復した。`);
  }

  // Anti-stall enrage: from Turn 4 onward, enemy ATK doubles exponentially relative to its max base ATK so stall/guard loops reach lethal by Turn 7-8
  if (state.turn >= 4) {
    const baseEnemyAtk = getEnemyBaseMaxAtk(state.enemy);
    const baseStep = Math.max(22, Math.floor(baseEnemyAtk * 0.6));
    const enrageGain = Math.floor(baseStep * Math.pow(2, state.turn - 4));
    if (enrageGain > 0) {
      state.enemyAtkBonus += enrageGain;
      state.logs.unshift(
        `${state.enemy.name} の長期戦激昂！攻撃力 +${enrageGain}（累計 +${state.enemyAtkBonus}）`
      );
    }
  }

  // Next turn setup
  state.turn += 1;
  state.cardsPlayedThisTurn = 0;
  const carryShield = state.relicIds.includes("white_revelation_sanctuary")
    ? Math.floor(state.playerShield * 0.5)
    : 0;
  state.playerShield = carryShield;
  if (carryShield > 0) {
    state.battleFlatAdd += carryShield;
    state.logs.unshift(
      `聖域の加護：余剰シールド +${carryShield} 持ち越し ＆ 一時基礎 +${carryShield}！`
    );
  }
  state.enemyWeakenPct = 0;
  state.freeExtremeUsedThisTurn = false;
  state.highRankCostDiscountThisTurn = 0;
  state.allCardCostDiscountThisTurn = 0;
  state.zeroCostTriggersThisTurn = 0;
  state.librarySkillDrawsThisTurn = 0;
  state.whiteRingTriggeredThisTurn = false;
  state.staircaseStep = 0;
  state.skillsPlayedThisTurn = 0;
  state.attacksPlayedThisTurn = 0;
  state.energySpentThisTurn = 0;
  state.attrsPlayedThisTurn = [];
  state.enemyIntentIdx += 1;

  // Black Pact blitz turn 3+ penalty: inject 2 F cards
  if (state.relicIds.includes("black_pact_blitz") && state.turn >= 3) {
    const curseWord = getWordMaster("やばい");
    if (curseWord) {
      nextDiscard.push(toBattleCard(curseWord, 0, `blitz_f_${state.turn}_0`));
      nextDiscard.push(toBattleCard(curseWord, 0, `blitz_f_${state.turn}_1`));
      state.logs.unshift("刹那の暴走（反動）：山札へ『不：やばい』2枚混入！");
    }
  }

  const drawCount = getTurnDrawCount(state.relicIds, false);
  const drawnRes = drawTurnOpeningHand(
    nextDraw,
    nextDiscard,
    state.relicIds,
    drawCount,
    `pact_f_${state.turn}`,
    getRng()
  );
  state.hand = drawnRes.hand;
  state.drawPile = drawnRes.nextDraw;
  state.discardPile = drawnRes.nextDiscard;

  const turnEnergy = getTurnMaxEnergy(state.relicIds, state.turn);
  state.maxEnergy = turnEnergy;
  state.energy = turnEnergy;
  state.rngStep = rngStep;
  state.logs = state.logs.slice(0, 20);
  return state;
}

export function chooseCardReward(
  prev: RunState,
  card: BattleCard | null
): RunState {
  if (prev.phase !== "reward_card") return prev;
  const state = { ...prev, deck: [...prev.deck], logs: [...prev.logs] };
  if (card) {
    state.deck.push(card);
  } else if (state.relicIds.includes("black_pact_ascetic")) {
    state.permanentMultBonus = Number((state.permanentMultBonus * 1.4).toFixed(2));
    state.permanentFlatAdd += 150;
    state.logs.unshift(
      "禁欲の代償発動！カード見送りにより永続乗算 ×1.4 ＆ 永続基礎 +150！"
    );
  } else {
    const healAmt = 6;
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healAmt);
    state.logs.unshift(`報酬を見送り、呼吸を整えて HP+${healAmt} 回復した。`);
  }

  // Roll 3 unowned normal relics
  let rngStep = state.rngStep;
  const nextRand = () => {
    const r = createSeededRng(state.rngSeed + rngStep * 7919);
    rngStep += 1;
    return r();
  };

  const availableUnique = NORMAL_RELICS.filter(
    (r) => !state.relicIds.includes(r.id)
  );
  const shuffledUnique = shuffleWithRng(availableUnique, () => nextRand());
  const shuffledRepeat = shuffleWithRng(REPEATABLE_RELICS, () => nextRand());

  const choices: RelicDef[] = [];
  if (shuffledUnique.length >= 3) {
    if (
      (state.floor >= 2 || state.isEndless) &&
      shuffledRepeat.length > 0 &&
      nextRand() < 0.5
    ) {
      choices.push(shuffledUnique[0], shuffledUnique[1], shuffledRepeat[0]);
    } else {
      choices.push(...shuffledUnique.slice(0, 3));
    }
  } else {
    choices.push(...shuffledUnique);
    for (const rep of shuffledRepeat) {
      if (choices.length >= 3) break;
      choices.push(rep);
    }
  }
  state.relicChoices = choices;
  state.rngStep = rngStep;

  if (state.relicChoices.length > 0) {
    state.phase = "reward_relic";
    return state;
  }
  return advanceToNextFloorOrEvent(state);
}

export function chooseRelicReward(
  prev: RunState,
  relic: RelicDef | null
): RunState {
  if (prev.phase !== "reward_relic") return prev;
  const nextLogs = [...prev.logs];
  let nextMaxHp = prev.playerMaxHp;
  let nextHp = prev.playerHp;

  if (!relic) {
    if (prev.relicIds.includes("black_pact_ascetic")) {
      nextLogs.unshift("遺物を見送った（禁欲の代償によりHP回復は無効）。");
    } else {
      nextHp = Math.min(nextMaxHp, nextHp + 8);
      nextLogs.unshift("遺物を受け取らずに見送った（HP +8 回復）。");
    }
  } else if (relic.id === "blood_ink_pact") {
    nextMaxHp += 15;
    nextHp += 15;
    nextLogs.unshift("『血染めの筆』を獲得！最大HP +15（代償：毎カードHP-5）。");
  }

  const state: RunState = {
    ...prev,
    logs: nextLogs.slice(0, 20),
    playerMaxHp: nextMaxHp,
    playerHp: nextHp,
    relicIds: relic ? [...prev.relicIds, relic.id] : prev.relicIds,
    tengenPermanentMult:
      relic?.id === "tengen_equation"
        ? Math.max(2, prev.tengenPermanentMult)
        : prev.tengenPermanentMult,
    permanentFlatAdd:
      relic?.id === "blessing_flat_1000"
        ? prev.permanentFlatAdd + 100
        : prev.permanentFlatAdd,
    permanentMultBonus:
      relic?.id === "blessing_mult_2"
        ? Number((prev.permanentMultBonus * 1.5).toFixed(3))
        : prev.permanentMultBonus,
    permanentExponentBonus:
      relic?.id === "blessing_exp_015"
        ? Number((prev.permanentExponentBonus + 0.015).toFixed(3))
        : prev.permanentExponentBonus,
  };
  return advanceToNextFloorOrEvent(state);
}

export type StagePostEventType = "covenant" | "library" | null;

export function getPostFloorEvent(
  totalStageFloors: number,
  floor: number,
  isEndless: boolean
): StagePostEventType {
  if (!isEndless && floor >= totalStageFloors) return null;
  if (isEndless) {
    const depth = floor - totalStageFloors;
    return depth % 2 === 1 ? "library" : "covenant";
  }
  if (floor === totalStageFloors - 1) return "library";
  if (totalStageFloors >= 6 && floor === 3) return "library";
  if (floor === 2 || (totalStageFloors >= 7 && floor === 4)) return "covenant";
  return null;
}

function advanceToNextFloorOrEvent(prev: RunState): RunState {
  const state = { ...prev };
  const scheduled = getPostFloorEvent(
    state.totalStageFloors,
    state.floor,
    state.isEndless
  );
  if (
    scheduled &&
    state.phase !== "event_covenant" &&
    state.phase !== "event_library"
  ) {
    let rngStep = state.rngStep;
    const r = createSeededRng(state.rngSeed + rngStep * 7919)();
    rngStep += 1;
    state.rngStep = rngStep;

    if (scheduled === "covenant") {
      const hasBlackPact = state.relicIds.some((id) =>
        id.startsWith("black_pact_")
      );
      const hasWhiteRev = state.relicIds.some((id) =>
        id.startsWith("white_revelation_")
      );
      const blacks = hasWhiteRev
        ? []
        : BLACK_COVENANT_RELICS.filter((b) => !state.relicIds.includes(b.id));
      const whites = hasBlackPact
        ? []
        : WHITE_REVELATION_RELICS.filter((w) => !state.relicIds.includes(w.id));

      if (blacks.length > 0 || whites.length > 0) {
        const r2 = createSeededRng(state.rngSeed + rngStep * 7919)();
        rngStep += 1;
        state.rngStep = rngStep;
        state.covenantOfferedBlack =
          blacks.length > 0
            ? blacks[Math.floor(r * blacks.length) % blacks.length]
            : null;
        state.covenantOfferedWhite =
          whites.length > 0
            ? whites[Math.floor(r2 * whites.length) % whites.length]
            : null;
        state.covenantOfferedRelic =
          state.covenantOfferedBlack ?? state.covenantOfferedWhite;
        state.covenantIsWhite =
          !state.covenantOfferedBlack && Boolean(state.covenantOfferedWhite);
        state.phase = "event_covenant";
        return state;
      }
    }

    state.libraryActionsRemaining = 2;
    state.phase = "event_library";
    return state;
  }

  return proceedNextBattleFloor(state);
}

export function resolveCovenantEvent(
  prev: RunState,
  choice: "black" | "white" | "skip"
): RunState {
  const state = {
    ...prev,
    relicIds: [...prev.relicIds],
    deck: [...prev.deck],
    logs: [...prev.logs],
  };
  const chosen =
    choice === "black"
      ? (state.covenantOfferedBlack ?? (!state.covenantIsWhite ? state.covenantOfferedRelic : null))
      : choice === "white"
        ? (state.covenantOfferedWhite ?? (state.covenantIsWhite ? state.covenantOfferedRelic : null))
        : null;

  if (chosen) {
    state.relicIds.push(chosen.id);
    if (chosen.id === "black_pact_glass") {
      state.playerMaxHp = Math.max(20, Math.floor(state.playerMaxHp / 2));
      state.playerHp = Math.min(state.playerHp, state.playerMaxHp);
    } else if (chosen.id === "black_pact_rot") {
      const noiseWord = getWordMaster("やばい");
      if (noiseWord) {
        const rng = createSeededRng(state.rngSeed + state.rngStep * 7919);
        state.rngStep += 1;
        const candidates = shuffleWithRng(
          state.deck
            .map((c, idx) => ({ c, idx }))
            .filter((x) => x.c.rank !== "F"),
          rng
        );
        const replaceSet = new Set(candidates.slice(0, 2).map((x) => x.idx));
        state.deck = state.deck.map((c, idx) =>
          replaceSet.has(idx)
            ? toBattleCard(noiseWord, 0, `rot_${state.floor}_${idx}`)
            : c
        );
      }
    }
    state.logs.unshift(`祭壇の選択：『${chosen.name}』を獲得！`);
  } else if (state.relicIds.includes("black_pact_ascetic")) {
    state.logs.unshift("祭壇を見送った（禁欲の代償によりHP回復は無効）。");
  } else {
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + 10);
    state.logs.unshift("どちらの祭壇も選ばず見送った（HP +10 回復）。");
  }

  state.covenantOfferedRelic = null;
  state.covenantOfferedBlack = null;
  state.covenantOfferedWhite = null;
  return proceedNextBattleFloor(state);
}

export function resolveLibraryEvent(
  prev: RunState,
  action: "heal" | "remove" | "upgrade" | "purge_all_f" | "leave",
  targetInstanceId?: string
): RunState {
  if (action === "leave" || prev.libraryActionsRemaining <= 0) {
    return proceedNextBattleFloor(prev);
  }

  const state = { ...prev, deck: [...prev.deck], logs: [...prev.logs] };
  let didAct = false;

  if (action === "heal") {
    if (state.relicIds.includes("black_pact_ascetic")) {
      return prev;
    }
    const healAmt = Math.floor(state.playerMaxHp * 0.35);
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healAmt);
    state.logs.unshift(`書庫で休息し、HPを ${healAmt} 回復した。`);
    didAct = true;
  } else if (action === "remove" && targetInstanceId && state.deck.length > 4) {
    const idx = state.deck.findIndex((c) => c.instanceId === targetInstanceId);
    if (idx !== -1) {
      const removed = state.deck.splice(idx, 1)[0];
      state.logs.unshift(`推敲：『${removed.term}』をデッキから削ぎ落とした。`);
      didAct = true;
    }
  } else if (action === "purge_all_f" && state.deck.length > 4) {
    const maxToRemove = state.deck.length - 4;
    let removedCount = 0;
    const kept: BattleCard[] = [];
    for (const c of state.deck) {
      if (c.rank === "F" && removedCount < maxToRemove) {
        removedCount += 1;
      } else {
        kept.push(c);
      }
    }
    if (removedCount > 0) {
      state.deck = kept;
      state.logs.unshift(`一括推敲：劣化カード『不』を ${removedCount} 枚一掃した！`);
      didAct = true;
    }
  } else if (action === "upgrade" && targetInstanceId) {
    const targetCard = state.deck.find((c) => c.instanceId === targetInstanceId);
    state.deck = state.deck.map((c) =>
      c.instanceId === targetInstanceId ? { ...c, plusLevel: c.plusLevel + 3 } : c
    );
    state.logs.unshift(
      targetCard
        ? `推敲強化：『${targetCard.term}』を +3 強化した（計 +${targetCard.plusLevel + 3}）。`
        : "推敲強化：語彙の基礎値が +3 研ぎ澄まされた。"
    );
    didAct = true;
  }

  if (!didAct) return prev;

  state.libraryActionsRemaining = Math.max(0, state.libraryActionsRemaining - 1);
  if (state.libraryActionsRemaining <= 0) {
    return proceedNextBattleFloor(state);
  }
  return state;
}

export function proceedNextBattleFloor(
  prev: RunState,
  enterEndless = false
): RunState {
  const stage = getStageDef(prev.stageId);
  const nextFloor = prev.floor + 1;
  const isEndless = prev.isEndless || enterEndless;

  const rng = createSeededRng(prev.rngSeed + nextFloor * 1337);
  const nextEnemy = pickEnemyForFloor(stage, nextFloor, isEndless, rng);
  let drawPile = shuffleWithRng(prev.deck, rng);

  if (prev.relicIds.includes("white_revelation_foresight")) {
    const isHighRank = (rank: BattleCard["rank"]) =>
      rank === "UR" || rank === "SSR" || rank === "SR";
    drawPile = [
      ...drawPile.filter((c) => isHighRank(c.rank)),
      ...drawPile.filter((c) => !isHighRank(c.rank)),
    ];
  }

  const drawCount = getTurnDrawCount(prev.relicIds, true);
  const openingRes = drawTurnOpeningHand(
    drawPile,
    [],
    prev.relicIds,
    drawCount,
    `pact_open_${nextFloor}`,
    rng
  );
  const hand = openingRes.hand;
  const remaining = openingRes.nextDraw;
  const initialDiscard: BattleCard[] = [...openingRes.nextDiscard];

  const turnEnergy = getTurnMaxEnergy(prev.relicIds, 1);

  let startMult = 1;
  if (prev.relicIds.includes("black_pact_glass")) startMult *= 5;
  if (prev.relicIds.includes("black_pact_truncate")) startMult *= 4;
  if (prev.relicIds.includes("white_revelation_omega")) startMult *= 2.2;
  if (prev.relicIds.includes("library_master")) {
    startMult *= 1 + Math.floor(prev.ownedVocabularyCount / 10) * 0.5;
  }
  startMult = startMult * prev.tengenPermanentMult * prev.permanentMultBonus;

  const initialShield =
    (prev.relicIds.includes("black_pact_rot") ? 25 : 0) +
    (prev.relicIds.includes("white_revelation_sanctuary")
      ? Math.floor(prev.playerMaxHp * 0.25)
      : 0);
  const startFlatAdd =
    prev.permanentFlatAdd +
    (prev.relicIds.includes("white_revelation_sanctuary") ? initialShield : 0);

  const startExponent = Number((1 + prev.permanentExponentBonus).toFixed(3));
  const startLogs = [
    `第${nextFloor}階${isEndless ? "（無間）" : ""}：${nextEnemy.name} 出現！`,
  ];
  if (nextEnemy.gimmickType === "curse_aura") {
    if (prev.relicIds.includes("white_revelation_pure")) {
      startLogs.unshift("無垢なる刃が【口癖汚染】の『不』混入を弾き返した！");
    } else {
      const curseWord = getWordMaster("やばい");
      if (curseWord) {
        initialDiscard.push(toBattleCard(curseWord, 0, `aura_${nextFloor}`));
        startLogs.unshift(
          `${nextEnemy.name} の特性【口癖汚染】：捨札に『不：やばい』が1枚混入！`
        );
      }
    }
  }

  return {
    ...prev,
    phase: "battle",
    floor: nextFloor,
    isEndless,
    turn: 1,
    cardsPlayedThisTurn: 0,
    totalCardsPlayedInBattle: 0,
    playerShield: initialShield,
    energy: turnEnergy,
    maxEnergy: turnEnergy,
    drawPile: remaining,
    hand,
    discardPile: initialDiscard,
    playedThisTurn: [],
    battleFlatAdd: startFlatAdd,
    battleMult: startMult,
    battleExponent: startExponent,
    nextCardMult: 1,
    nextCardRetrigger: 0,
    nextAttackMult: 1,
    nextAttackFlatAdd: 0,
    nextFInverted: false,
    nextFInvertMult: 1,
    pendingSelfHarmPctAfterAttack: 0,
    selfHarmHpTotalInBattle: 0,
    selfHarmCountInBattle: 0,
    skillsPlayedThisTurn: 0,
    attacksPlayedThisTurn: 0,
    guardsPlayedInBattle: 0,
    energySpentThisTurn: 0,
    attrsPlayedThisTurn: [],
    lastCombatAction: null,
    lastAttrPlayed: null,
    attrsPlayedThisBattle: [],
    fourElementsTriggeredThisBattle: false,
    enemyWeakenPct: 0,
    freeExtremeUsedThisTurn: false,
    highRankCostDiscountThisTurn: 0,
    allCardCostDiscountThisTurn: 0,
    zeroCostTriggersThisTurn: 0,
    librarySkillDrawsThisTurn: 0,
    whiteRingTriggeredThisTurn: false,
    staircaseStep: 0,
    enemy: nextEnemy,
    enemyHp: nextEnemy.maxHp,
    enemyShield: 0,
    enemyAtkBonus: 0,
    enemyIntentIdx: 0,
    libraryActionsRemaining: 0,
    cardChoices: [],
    relicChoices: [],
    lastOutput: null,
    encounteredEnemyIds: Array.from(
      new Set([...prev.encounteredEnemyIds, nextEnemy.id])
    ),
    logs: [...startLogs, ...prev.logs].slice(0, 20),
  };
}

export function getRelicLabels(relicIds: string[]): RelicDef[] {
  return relicIds
    .map((id) => getRelicDef(id))
    .filter((r): r is RelicDef => Boolean(r));
}
