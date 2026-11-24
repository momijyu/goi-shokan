import { THEME_PACKS } from "@/data/words";
import type {
  AchievementCategory,
  AchievementDef,
  PlayerSaveData,
} from "@/types/game";

export const ACHIEVEMENT_CATEGORIES: {
  id: AchievementCategory;
  label: string;
  description: string;
}[] = [
  {
    id: "collection",
    label: "語彙収集・採掘",
    description: "文章からの語彙採掘、未知語『異』の発見、テーマ図鑑の制覇目標。",
  },
  {
    id: "relic",
    label: "遺物図鑑",
    description: "迷宮で手に入る84種の遺物の収集マイルストーン。",
  },
  {
    id: "damage",
    label: "出力到達記録",
    description: "一撃出力の桁を更新していくエンドレス火力目標。",
  },
  {
    id: "dungeon",
    label: "迷宮踏破・挑戦",
    description: "各階層・特別モード・無間地獄・特殊構築での踏破目標。",
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  // === 1. 語彙収集・採掘 ===
  {
    id: "first_summon",
    title: "初・言霊採掘",
    description: "初めて文章を解析して語彙カードを獲得した。",
    badgeKanji: "掘",
    category: "collection",
  },
  {
    id: "summon_10",
    title: "言霊の発掘師",
    description: "文章採掘（召喚）を累計10回行った。",
    badgeKanji: "鉱",
    category: "collection",
  },
  {
    id: "summon_30",
    title: "文脈の錬金術師",
    description: "文章採掘（召喚）を累計30回行った。",
    badgeKanji: "錬",
    category: "collection",
  },
  {
    id: "collect_30",
    title: "言葉の収集家",
    description: "所持語彙カードが30種類に到達した。",
    badgeKanji: "集",
    category: "collection",
  },
  {
    id: "collect_60",
    title: "語彙の蔵書家",
    description: "所持語彙カードが60種類に到達した。",
    badgeKanji: "蔵",
    category: "collection",
  },
  {
    id: "collect_100",
    title: "百語の賢者",
    description: "所持語彙カードが100種類に到達した。",
    badgeKanji: "百",
    category: "collection",
  },
  {
    id: "collect_150",
    title: "大辞典の主",
    description: "所持語彙カードが150種類に到達した。",
    badgeKanji: "辞",
    category: "collection",
  },
  {
    id: "discover_ur",
    title: "異端観測者",
    description: "辞書にない真の未知語『異』カードを初めて観測した。",
    badgeKanji: "異",
    category: "collection",
  },
  {
    id: "discover_ur_5",
    title: "深淵の観測者",
    description: "未知語『異』カードを5種類以上所持した。",
    badgeKanji: "測",
    category: "collection",
  },
  {
    id: "pack_complete",
    title: "一派修得",
    description: "語彙図鑑のテーマのいずれか1つをすべて収集した。",
    badgeKanji: "修",
    category: "collection",
  },
  {
    id: "pack_complete_3",
    title: "博覧強記",
    description: "語彙図鑑のテーマを3つ以上コンプリートした。",
    badgeKanji: "博",
    category: "collection",
  },

  // === 2. 遺物図鑑 ===
  {
    id: "relic_15",
    title: "遺物蒐集家",
    description: "発見済み遺物が15種類に到達した。",
    badgeKanji: "宝",
    category: "relic",
  },
  {
    id: "relic_40",
    title: "秘宝の探究者",
    description: "発見済み遺物が40種類に到達した。",
    badgeKanji: "秘",
    category: "relic",
  },
  {
    id: "relic_all_70",
    title: "森羅の遺物王",
    description: "発見済み遺物が70種類以上に到達した。",
    badgeKanji: "冠",
    category: "relic",
  },

  // === 3. 出力到達記録 ===
  {
    id: "dmg_man",
    title: "万の斬撃",
    description: "バトル中、一撃で「1万」以上の出力を叩き出した。",
    badgeKanji: "万",
    category: "damage",
  },
  {
    id: "dmg_oku",
    title: "億超えの言霊",
    description: "バトル中、一撃で「1億」以上の出力を叩き出した。",
    badgeKanji: "億",
    category: "damage",
  },
  {
    id: "dmg_cho",
    title: "兆の彼方へ",
    description: "バトル中、一撃で「1兆」以上の出力を叩き出した。",
    badgeKanji: "兆",
    category: "damage",
  },
  {
    id: "dmg_kei",
    title: "京域の閃光",
    description: "バトル中、一撃で「1京（10^16）」以上の出力を叩き出した。",
    badgeKanji: "京",
    category: "damage",
  },
  {
    id: "dmg_gai",
    title: "垓宙の一太刀",
    description: "バトル中、一撃で「1垓（10^20）」以上の出力を叩き出した。",
    badgeKanji: "垓",
    category: "damage",
  },
  {
    id: "dmg_muryo",
    title: "無量大数の境地",
    description: "バトル中、一撃で「1無量大数（10^68）」以上の出力を叩き出した。",
    badgeKanji: "無",
    category: "damage",
  },

  // === 4. 迷宮踏破・挑戦 ===
  {
    id: "clear_stage_1",
    title: "沼地踏破",
    description: "第一層：口癖の沼地をクリアした。",
    badgeKanji: "破",
    category: "dungeon",
  },
  {
    id: "clear_stage_2",
    title: "書庫突破",
    description: "第二層：文脈の書庫をクリアした。",
    badgeKanji: "書",
    category: "dungeon",
  },
  {
    id: "clear_stage_3",
    title: "深淵の制覇者",
    description: "第三層：文豪の深淵をクリアした。",
    badgeKanji: "覇",
    category: "dungeon",
  },
  {
    id: "clear_random",
    title: "無作為の勝者",
    description: "特別迷宮「混沌の無作為迷宮」をクリアした。",
    badgeKanji: "乱",
    category: "dungeon",
  },
  {
    id: "clear_impromptu",
    title: "即興詩人",
    description: "特別迷宮「一文即興の迷宮」をクリアした。",
    badgeKanji: "即",
    category: "dungeon",
  },
  {
    id: "daily_clear",
    title: "日替わり制覇",
    description: "日替わり挑戦（デイリーチャレンジ）でステージをクリアした。",
    badgeKanji: "日",
    category: "dungeon",
  },
  {
    id: "endless_20",
    title: "無間への一歩",
    description: "Endless（無間地獄）を含め、通算第20階以上に到達した。",
    badgeKanji: "歩",
    category: "dungeon",
  },
  {
    id: "endless_50",
    title: "無間の深層",
    description: "Endless（無間地獄）を含め、通算第50階以上に到達した。",
    badgeKanji: "深",
    category: "dungeon",
  },
  {
    id: "endless_100",
    title: "無間踏破・百層",
    description: "Endless（無間地獄）を含め、通算第100階以上に到達した。",
    badgeKanji: "極",
    category: "dungeon",
  },
  {
    id: "white_revelation",
    title: "誘惑を退けし者",
    description: "運命の祭壇にて『白き天啓』を選択し、純潔なる祝福を手に入れた。",
    badgeKanji: "白",
    category: "dungeon",
  },
  {
    id: "black_covenant",
    title: "禁忌の契約者",
    description: "運命の祭壇にて『黒き契約』を選択し、代償と引き換えの力を手に入れた。",
    badgeKanji: "黒",
    category: "dungeon",
  },
  {
    id: "f_build_win",
    title: "泥中の勝利",
    description: "デッキに『不』カードを含んだままステージをクリアした。",
    badgeKanji: "泥",
    category: "dungeon",
  },
  {
    id: "english_deck_win",
    title: "異国語の連弾",
    description: "デッキに英語カードを3枚以上含んだ状態でステージをクリアした。",
    badgeKanji: "英",
    category: "dungeon",
  },
  {
    id: "minimalist_win",
    title: "研ぎ澄ます一文",
    description: "デッキ枚数8枚以下のままステージをクリアした。",
    badgeKanji: "剣",
    category: "dungeon",
  },
];

export function getAchievementProgress(
  id: string,
  save: PlayerSaveData
): { current: number; target: number; unit: string } | null {
  const ownedCount = Object.keys(save.ownedWords).length;
  const urCount = Object.values(save.ownedWords).filter((w) => w.rank === "UR").length;
  const completedPacks = THEME_PACKS.filter((p) =>
    p.terms.every((t) => Boolean(save.ownedWords[t]))
  ).length;
  const maxFloor = save.runHistories.reduce(
    (max, h) => Math.max(max, h.reachedFloor),
    0
  );

  switch (id) {
    case "first_summon":
      return { current: Math.min(1, save.totalSummons), target: 1, unit: "回" };
    case "summon_10":
      return { current: Math.min(10, save.totalSummons), target: 10, unit: "回" };
    case "summon_30":
      return { current: Math.min(30, save.totalSummons), target: 30, unit: "回" };
    case "collect_30":
      return { current: Math.min(30, ownedCount), target: 30, unit: "語" };
    case "collect_60":
      return { current: Math.min(60, ownedCount), target: 60, unit: "語" };
    case "collect_100":
      return { current: Math.min(100, ownedCount), target: 100, unit: "語" };
    case "collect_150":
      return { current: Math.min(150, ownedCount), target: 150, unit: "語" };
    case "discover_ur":
      return { current: Math.min(1, urCount), target: 1, unit: "種" };
    case "discover_ur_5":
      return { current: Math.min(5, urCount), target: 5, unit: "種" };
    case "pack_complete":
      return { current: Math.min(1, completedPacks), target: 1, unit: "種" };
    case "pack_complete_3":
      return { current: Math.min(3, completedPacks), target: 3, unit: "種" };
    case "relic_15":
      return { current: Math.min(15, save.discoveredRelics.length), target: 15, unit: "種" };
    case "relic_40":
      return { current: Math.min(40, save.discoveredRelics.length), target: 40, unit: "種" };
    case "relic_all_70":
      return { current: Math.min(70, save.discoveredRelics.length), target: 70, unit: "種" };
    case "endless_20":
      return { current: Math.min(20, maxFloor), target: 20, unit: "階" };
    case "endless_50":
      return { current: Math.min(50, maxFloor), target: 50, unit: "階" };
    case "endless_100":
      return { current: Math.min(100, maxFloor), target: 100, unit: "階" };
    default:
      return null;
  }
}
