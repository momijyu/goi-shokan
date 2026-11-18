import type { AchievementDef } from "@/types/game";

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_summon",
    title: "初・言霊採掘",
    description: "初めて文章を解析して語彙カードを獲得した。",
    badgeKanji: "掘",
  },
  {
    id: "discover_ur",
    title: "異端観測者",
    description: "辞書にない真の未知語『異』カードを初めて観測した。",
    badgeKanji: "異",
  },
  {
    id: "collect_30",
    title: "言葉の収集家",
    description: "所持語彙カードが30種類に到達した。",
    badgeKanji: "集",
  },
  {
    id: "collect_60",
    title: "語彙の蔵書家",
    description: "所持語彙カードが60種類に到達した。",
    badgeKanji: "蔵",
  },
  {
    id: "pack_complete",
    title: "一派修得",
    description: "語彙図鑑のテーマのいずれか1つをすべて収集した。",
    badgeKanji: "修",
  },
  {
    id: "dmg_man",
    title: "万の斬撃",
    description: "バトル中、一撃で「1万」以上の出力を叩き出した。",
    badgeKanji: "万",
  },
  {
    id: "dmg_oku",
    title: "億超えの言霊",
    description: "バトル中、一撃で「1億」以上の出力を叩き出した。",
    badgeKanji: "億",
  },
  {
    id: "dmg_cho",
    title: "兆の彼方へ",
    description: "バトル中、一撃で「1兆」以上の出力を叩き出した。",
    badgeKanji: "兆",
  },
  {
    id: "clear_stage_1",
    title: "沼地踏破",
    description: "第一層：口癖の沼地をクリアした。",
    badgeKanji: "破",
  },
  {
    id: "clear_stage_3",
    title: "深淵の制覇者",
    description: "第三層：文豪の深淵をクリアした。",
    badgeKanji: "覇",
  },
  {
    id: "white_revelation",
    title: "誘惑を退けし者",
    description: "運命の祭壇にて『白き天啓』を選択し、純潔なる祝福を手に入れた。",
    badgeKanji: "白",
  },
  {
    id: "f_build_win",
    title: "泥中の勝利",
    description: "デッキに『不』カードを含んだままステージをクリアした。",
    badgeKanji: "泥",
  },
];
