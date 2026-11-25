export type Rank = "F" | "N" | "R" | "SR" | "SSR" | "UR";

export type Attribute = "logic" | "emotion" | "sense" | "matter";

export type CommandRole = "attack" | "skill" | "guard";

export type PosCategory = "noun" | "verb" | "adj" | "adv" | "conj" | "idiom" | "other";

export type SkillType =
  | "draw"            // ドロー
  | "energy"          // コスト回復
  | "mult_next"       // 次の出力に乗算バフ
  | "mult_battle"     // この戦闘中の永続乗算バフ
  | "retrigger_next"  // 次のカードを再発動+1
  | "weaken"          // 敵の攻撃力低下
  | "pierce_burst"    // 防御無視ダメージ＋倍率乗算
  | "chaos_curse"     // 不ランクの暴走効果
  | "english_link"    // 英単語専用：手札の英語数に応じた倍率加算＋1ドロー
  | "english_discount"// 英単語専用：このターン手札全コスト-1＋永続基礎加算
  | "english_purge"   // 英単語専用：『不』を戦闘から除外＋戦闘倍率乗算
  // --- 自傷・背水・不活用系 ---
  | "desperation_mult"// HP30%以下なら次攻撃倍率
  | "sacrifice_mult"  // 現在HP50%消費＋次攻撃倍率
  | "vengeance_flat"  // 自傷HP累計×Nを次攻撃基礎へ加算
  | "f_resonance"     // 手札『不』1枚につき戦闘倍率乗算
  | "f_invert"        // 次の『不』1枚のデメリット無効＆出力×N
  | "f_sacrifice"     // 手札『不』1枚戦闘除外＋次攻撃倍率
  | "curse_stack"     // この戦闘の自傷回数ごとに戦闘倍率乗算
  | "moroha_edge"     // 次攻撃倍率＋攻撃後最大HP10%消費
  // --- 構築・行動参照系 ---
  | "accumulate_cards"// 戦闘使用枚数に応じた次攻撃倍率（最大15枚）
  | "skill_chain"     // 今ターンのスキル回数に応じた次攻撃倍率
  | "cost_amp"        // 今ターンの消費コスト累計に応じた次攻撃倍率
  | "diversity_mult"  // 今ターンの使用属性数に応じた戦闘倍率加算
  | "guard_stock"     // 戦闘中の防御回数に応じた次攻撃倍率加算（上限あり）
  | "mimic_last"      // 直前の攻撃/防御出力の50%を再現
  | "pursuit_combo"   // 今ターンの攻撃回数だけ次攻撃を再発動+
  | "self_harm_mult"; // 今戦闘で受けた自傷HP累計×Nを戦闘倍率へ加算

export interface SubSkillEffect {
  type: "draw" | "energy" | "mult_next" | "mult_battle" | "weaken" | "retrigger_next";
  power: number;
}

/**
 * Generates unified, concise Japanese skill text in one fixed clause order:
 * Burst/Recoil -> Cost -> Draw -> Weaken -> Battle Mult -> Next Mult -> Retrigger
 */
export function formatSkillDescription(
  skillType: SkillType,
  skillPower: number,
  subSkill?: SubSkillEffect
): string {
  type Clause = { order: number; text: string };
  const clauses: Clause[] = [];

  const addEffect = (type: SkillType | SubSkillEffect["type"], power: number) => {
    switch (type) {
      case "pierce_burst":
        clauses.push({ order: 1, text: "盾無視ダメ" });
        clauses.push({ order: 6, text: `戦闘倍率 ×${power}` });
        break;
      case "chaos_curse":
        clauses.push({ order: 1, text: "自傷HP3(最低HP1)" });
        clauses.push({ order: 7, text: `次カード ×${power}` });
        break;
      case "energy":
        clauses.push({ order: 2, text: `コスト +${power}` });
        break;
      case "draw":
        clauses.push({ order: 3, text: `山札 ${power}枚引く` });
        break;
      case "weaken":
        clauses.push({ order: 4, text: `敵ATK ${power}%低下` });
        break;
      case "mult_battle":
        clauses.push({ order: 6, text: `戦闘倍率 ×${power}` });
        break;
      case "mult_next":
        clauses.push({ order: 7, text: `次カード ×${power}` });
        break;
      case "retrigger_next":
        clauses.push({ order: 8, text: `次カード再発動 +${power}` });
        break;
      case "english_link":
        clauses.push({ order: 3, text: "山札 1枚引く" });
        clauses.push({
          order: 6,
          text: `英語1枚(手札+自身)につき 戦闘倍率 +${power}ずつ加算`,
        });
        break;
      case "english_discount":
        clauses.push({ order: 2, text: "次の1枚コスト-1 ＋ 全英語札コスト-1" });
        clauses.push({ order: 6, text: `戦闘倍率 ×${power}` });
        break;
      case "english_purge":
        clauses.push({ order: 3, text: "『不』1枚除外" });
        clauses.push({ order: 6, text: `戦闘倍率 ×${power}` });
        break;
      case "desperation_mult":
        clauses.push({ order: 7, text: `HP50%以下なら次攻撃 ×${power}` });
        break;
      case "sacrifice_mult":
        clauses.push({ order: 1, text: "現在HP40%消費(最低HP1)＋消費分シールド" });
        clauses.push({ order: 7, text: `次攻撃 ×${power}` });
        break;
      case "vengeance_flat":
        clauses.push({ order: 7, text: `次攻撃倍率 +(自傷HP累計×${power})` });
        break;
      case "f_resonance":
        clauses.push({
          order: 6,
          text: `手札『不』1枚につき 戦闘倍率 ×${power}ずつ乗算`,
        });
        break;
      case "f_invert":
        clauses.push({ order: 7, text: `次の『不』自傷無効＆出力 ×${power}` });
        break;
      case "f_sacrifice":
        clauses.push({ order: 3, text: "手札『不』1枚除外" });
        clauses.push({ order: 7, text: `次攻撃 ×${power}` });
        break;
      case "curse_stack":
        clauses.push({
          order: 6,
          text: `今戦闘の自傷1回につき 戦闘倍率 ×${power}ずつ乗算`,
        });
        break;
      case "moroha_edge":
        clauses.push({
          order: 7,
          text: `次攻撃 ×${power}（攻撃後HP8%消費・最低HP1）`,
        });
        break;
      case "accumulate_cards":
        clauses.push({
          order: 7,
          text: `今戦闘の使用1枚につき 次攻撃 ×${power}ずつ乗算(最大15)`,
        });
        break;
      case "skill_chain":
        clauses.push({
          order: 7,
          text: `今ターンスキル1回につき 次攻撃 ×${power}ずつ乗算`,
        });
        break;
      case "cost_amp":
        clauses.push({
          order: 7,
          text: `今ターン消費コスト1につき 次攻撃 ×${power}ずつ乗算`,
        });
        break;
      case "diversity_mult":
        clauses.push({
          order: 6,
          text: `今ターン属性1種につき 戦闘倍率 +${power}ずつ加算`,
        });
        break;
      case "guard_stock":
        clauses.push({
          order: 7,
          text: `戦闘防御1回につき 次攻撃倍率 +${power}ずつ加算`,
        });
        break;
      case "mimic_last":
        clauses.push({
          order: 1,
          text: `直前攻撃/防御の${Math.round(power * 100)}%を再現`,
        });
        break;
      case "pursuit_combo":
        clauses.push({
          order: 7,
          text: `今ターン攻撃1回につき 次攻撃 ×${power}ずつ乗算`,
        });
        break;
      case "self_harm_mult":
        clauses.push({
          order: 6,
          text: `自傷HP累計×${power} 戦闘倍率加算`,
        });
        break;
    }
  };

  addEffect(skillType, skillPower);
  if (subSkill) {
    addEffect(subSkill.type, subSkill.power);
  }

  clauses.sort((a, b) => a.order - b.order);
  return clauses.map((c) => c.text).join(" ＋ ");
}

export interface WordMasterEntry {
  term: string;
  reading: string;
  pos: PosCategory;
  rank: Rank;
  attribute: Attribute;
  cost: number;
  baseAtk: number;
  baseDef: number;
  skillType: SkillType;
  skillPower: number;
  skillDesc: string;
  subSkill?: SubSkillEffect;
  themePack?: string;
}

export interface OwnedWord extends WordMasterEntry {
  obtainCount: number;
  firstSnippet: string;
  firstDiscoveredAt: string;
  isUnknownGenerated?: boolean;
}

export interface BattleCard extends WordMasterEntry {
  instanceId: string;
  plusLevel: number;
  isTemporaryTrial?: boolean;
}

export type RelicCategory = "loop" | "rule_break" | "scaling" | "covenant";

export interface RelicDef {
  id: string;
  name: string;
  rankLabel: string;
  category: RelicCategory;
  description: string;
  flavor: string;
  isBlackCovenant?: boolean;
  isWhiteRevelation?: boolean;
  isRepeatable?: boolean;
}

export type EnemyIntentType = "attack" | "heavy_attack" | "curse_f" | "buff" | "defend";

export interface EnemyIntent {
  type: EnemyIntentType;
  value: number;
  label: string;
}

export type EnemyGimmickType = "combo_armor" | "heavy_dampen" | "curse_aura";

export interface EnemyDef {
  id: string;
  name: string;
  title: string;
  spriteId: string;
  attribute: Attribute;
  maxHp: number;
  isBoss?: boolean;
  isElite?: boolean;
  pattern: EnemyIntent[];
  gimmickType?: EnemyGimmickType;
  gimmickDesc?: string;
}

export interface ThemePackDef {
  id: string;
  name: string;
  description: string;
  terms: string[];
}

export type AchievementCategory = "collection" | "relic" | "damage" | "dungeon";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  badgeKanji: string;
  category: AchievementCategory;
}

export interface RunHistoryEntry {
  id: string;
  stageId: string;
  stageName: string;
  isDaily: boolean;
  dailyDate?: string | null;
  cleared: boolean;
  reachedFloor: number;
  maxDamage: number;
  relicIds: string[];
  createdAt: string;
}

export interface DeckPreset {
  id: string;
  name: string;
  deckPoolTerms: string[];
  aceTerm: string;
  updatedAt: string;
}

export interface PlayerSaveData {
  guestName: string;
  ownedWords: Record<string, OwnedWord>;
  deckPoolTerms: string[];
  aceTerm: string;
  deckPresets?: DeckPreset[];
  activePresetId?: string | null;
  unlockedAchievements: string[];
  clearedStages: string[];
  discoveredRelics: string[];
  encounteredEnemies: string[];
  runHistories: RunHistoryEntry[];
  bestRunRecords?: Record<string, RunHistoryEntry>;
  bestDamage: number;
  totalSummons: number;
  recentTextHashes?: string[];
  tutorialDismissed?: boolean;
}

export const PLUS_STAT_STEP = 5;

export function getEffectiveStats(
  word: WordMasterEntry,
  plusLevel = 0
): { plusLevel: number; atk: number; def: number } {
  const safePlus = Math.max(0, Math.floor(plusLevel));
  const bonus = safePlus * PLUS_STAT_STEP;
  return {
    plusLevel: safePlus,
    atk: word.baseAtk + bonus,
    def: word.baseDef + bonus,
  };
}

export const SKILL_META: Record<
  SkillType,
  { label: string; shortTag: string; color: string }
> = {
  draw: { label: "ドロー（手札補充）", shortTag: "手札補充", color: "#69A3D9" },
  energy: { label: "コスト回復", shortTag: "コスト回復", color: "#E3B94E" },
  mult_next: { label: "次札乗算バフ", shortTag: "次札乗算", color: "#57B889" },
  mult_battle: { label: "戦闘中乗算累積", shortTag: "戦闘乗算", color: "#E88A38" },
  retrigger_next: { label: "再発動（連撃付与）", shortTag: "再発動", color: "#D4AF37" },
  weaken: { label: "敵弱体（ATK低下）", shortTag: "敵弱体", color: "#4EB887" },
  pierce_burst: { label: "防御貫通バースト", shortTag: "防御貫通", color: "#E05A47" },
  chaos_curse: { label: "不の暴走", shortTag: "暴走リスク", color: "#A38A78" },
  english_link: { label: "英語共鳴（手札連携）", shortTag: "英語共鳴", color: "#4FA8D6" },
  english_discount: { label: "英語変換（英語＆次札コスト軽減）", shortTag: "英語軽減", color: "#9B7EDE" },
  english_purge: { label: "英語浄化（不の消去）", shortTag: "英語浄化", color: "#5EC2A6" },
  desperation_mult: { label: "背水強化（HP50%以下）", shortTag: "背水倍化", color: "#E05A47" },
  sacrifice_mult: { label: "生贄増幅（HP40%消費）", shortTag: "生贄倍化", color: "#C93A2B" },
  vengeance_flat: { label: "復讐倍率（自傷還元）", shortTag: "復讐倍率", color: "#D96B43" },
  f_resonance: { label: "不の共鳴", shortTag: "不の共鳴", color: "#B89387" },
  f_invert: { label: "不の反転", shortTag: "不の反転", color: "#C8A464" },
  f_sacrifice: { label: "不の犠牲", shortTag: "不の犠牲", color: "#A36B62" },
  curse_stack: { label: "呪いの蓄積", shortTag: "呪い蓄積", color: "#9E5C76" },
  moroha_edge: { label: "諸刃増幅", shortTag: "諸刃", color: "#D44D4D" },
  accumulate_cards: { label: "累積増幅", shortTag: "累積", color: "#D4AF37" },
  skill_chain: { label: "技連鎖", shortTag: "技連鎖", color: "#69A3D9" },
  cost_amp: { label: "消費増幅", shortTag: "消費増幅", color: "#E3B94E" },
  diversity_mult: { label: "多様性共鳴", shortTag: "多様性", color: "#57B889" },
  guard_stock: { label: "堅守蓄積", shortTag: "堅守蓄積", color: "#5B9BD5" },
  mimic_last: { label: "模倣再現", shortTag: "模倣", color: "#A98EE0" },
  pursuit_combo: { label: "追撃蓄積", shortTag: "追撃", color: "#E88A38" },
  self_harm_mult: { label: "痛覚昇華（自傷還元）", shortTag: "痛覚昇華", color: "#D44D4D" },
};

export const RANK_META: Record<
  Rank,
  {
    kanji: string;
    label: string;
    pips: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  F: {
    kanji: "不",
    label: "不適",
    pips: "×",
    color: "#B89387",
    bg: "#261818",
    border: "#6E3B37",
  },
  N: {
    kanji: "常",
    label: "日常",
    pips: "◇",
    color: "#B8B2A6",
    bg: "#1B191E",
    border: "#4A453C",
  },
  R: {
    kanji: "良",
    label: "標準",
    pips: "◆◆",
    color: "#DCE6F0",
    bg: "#1C222B",
    border: "#7D8B99",
  },
  SR: {
    kanji: "秀",
    label: "秀逸",
    pips: "◆◆◆",
    color: "#F7EFE0",
    bg: "#26231D",
    border: "#C9BFA8",
  },
  SSR: {
    kanji: "極",
    label: "極致",
    pips: "★★★★",
    color: "#FCE181",
    bg: "#33260C",
    border: "#E3B94E",
  },
  UR: {
    kanji: "異",
    label: "異端",
    pips: "✦✦",
    color: "#FF8575",
    bg: "#331214",
    border: "#E05A47",
  },
};

export const ATTR_META: Record<
  Attribute,
  {
    kanji: string;
    label: string;
    roleHint: string;
    battleEffect: string;
    color: string;
    border: string;
    tintBg: string;
    glow: string;
  }
> = {
  logic: {
    kanji: "論",
    label: "論理",
    roleHint: "盾↑",
    battleEffect: "ぼうぎょ時 シールド×1.25（極・異で攻撃時は敵盾貫通）",
    color: "#69A9E6",
    border: "#3B82C4",
    tintBg: "#0E1622",
    glow: "rgba(59, 130, 196, 0.38)",
  },
  emotion: {
    kanji: "情",
    label: "感情",
    roleHint: "攻↑",
    battleEffect: "こうげき時 ダメージ×1.25",
    color: "#ED6A5A",
    border: "#C94338",
    tintBg: "#1F1012",
    glow: "rgba(201, 67, 56, 0.38)",
  },
  sense: {
    kanji: "感",
    label: "感覚",
    roleHint: "攻↑",
    battleEffect: "こうげき時 ダメージ×1.25",
    color: "#57C992",
    border: "#359E6E",
    tintBg: "#0E1D17",
    glow: "rgba(53, 158, 110, 0.38)",
  },
  matter: {
    kanji: "物",
    label: "物質",
    roleHint: "盾↑",
    battleEffect: "ぼうぎょ時 シールド×1.25",
    color: "#C4BEB0",
    border: "#8E8676",
    tintBg: "#181614",
    glow: "rgba(142, 134, 118, 0.32)",
  },
};
