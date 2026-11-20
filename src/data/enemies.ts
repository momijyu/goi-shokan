import type { Attribute, EnemyDef } from "@/types/game";

export interface StageDef {
  id: string;
  name: string;
  subtitle: string;
  recommendedPower: string;
  totalFloors: number;
  baseHpScale: number;
  enemies: EnemyDef[];
  boss: EnemyDef;
}

export const STAGES: StageDef[] = [
  {
    id: "stage_1",
    name: "第一層：口癖の沼地",
    subtitle: "曖昧な言葉が漂う入門迷宮。基礎を固めて抜け出せ。",
    recommendedPower: "初級（初期デッキ可）",
    totalFloors: 5,
    baseHpScale: 1,
    enemies: [
      {
        id: "slime_yabai",
        name: "濁音スライム",
        title: "思考停止の塊",
        spriteId: "slime",
        attribute: "emotion",
        maxHp: 240,
        pattern: [
          { type: "attack", value: 9, label: "体当たり 9" },
          { type: "curse_f", value: 1, label: "口癖混入（不+1）" },
          { type: "attack", value: 12, label: "暴言飛沫 12" },
        ],
      },
      {
        id: "wisp_filler",
        name: "接続の亡霊",
        title: "話が噛み合わない霊",
        spriteId: "wisp",
        attribute: "sense",
        maxHp: 310,
        gimmickType: "heavy_dampen",
        gimmickDesc: "重圧耐性：コスト2以上の単発攻撃は威力40%軽減（コスト0〜1は等倍）",
        pattern: [
          { type: "attack", value: 10, label: "曖昧斬り 10" },
          { type: "defend", value: 20, label: "煙幕防御 +20" },
          { type: "heavy_attack", value: 16, label: "堂々巡り 16" },
        ],
      },
      {
        id: "oni_slang",
        name: "俗語の小鬼",
        title: "流行語の暴走体",
        spriteId: "oni",
        attribute: "emotion",
        maxHp: 440,
        isElite: true,
        gimmickType: "curse_aura",
        gimmickDesc: "口癖汚染：開戦時、捨札に『不』を1枚混ぜる",
        pattern: [
          { type: "curse_f", value: 1, label: "スラング感染（不+1）" },
          { type: "heavy_attack", value: 20, label: "感情暴走 20" },
          { type: "buff", value: 4, label: "勢い上昇 ATK+4" },
        ],
      },
    ],
    boss: {
      id: "boss_diary",
      name: "白紙の日記魔人",
      title: "第一層守護者",
      spriteId: "golem",
      attribute: "matter",
      maxHp: 1200,
      isBoss: true,
      gimmickType: "combo_armor",
      gimmickDesc: "連撃障壁：1ターン3枚目までの攻撃を45%軽減。4枚目以降は防御が崩れ1.4倍通る",
      pattern: [
        { type: "attack", value: 15, label: "凡庸な一撃 15" },
        { type: "defend", value: 32, label: "先延ばしの壁 +32" },
        { type: "curse_f", value: 2, label: "三日坊主（不+2）" },
        { type: "heavy_attack", value: 26, label: "白紙の重圧 26" },
      ],
    },
  },
  {
    id: "stage_2",
    name: "第二層：論理の城塞",
    subtitle: "硬直した定型文と鉄壁の盾が待ち受ける中級迷宮。",
    recommendedPower: "中級（遺物の連携推奨）",
    totalFloors: 6,
    baseHpScale: 2.2,
    enemies: [
      {
        id: "knight_bureau",
        name: "定型文の騎士",
        title: "前例踏襲の番人",
        spriteId: "knight",
        attribute: "logic",
        maxHp: 980,
        gimmickType: "combo_armor",
        gimmickDesc: "連撃障壁：1ターン3枚目までの攻撃を45%軽減。4枚目以降は1.4倍",
        pattern: [
          { type: "defend", value: 50, label: "形式主義の盾 +50" },
          { type: "attack", value: 18, label: "規律の一閃 18" },
          { type: "heavy_attack", value: 28, label: "冷徹な却下 28" },
        ],
      },
      {
        id: "golem_jargon",
        name: "難語ゴーレム",
        title: "過積載の怪文書",
        spriteId: "golem",
        attribute: "matter",
        maxHp: 1450,
        isElite: true,
        gimmickType: "heavy_dampen",
        gimmickDesc: "難語吸収：コスト2以上の攻撃を40%軽減。軽量な『常』連撃が有効",
        pattern: [
          { type: "buff", value: 6, label: "抽象化 ATK+6" },
          { type: "heavy_attack", value: 30, label: "概念圧殺 30" },
          { type: "defend", value: 75, label: "難解装甲 +75" },
        ],
      },
      {
        id: "tengu_sense",
        name: "修辞の天狗",
        title: "言葉の剣豪",
        spriteId: "tengu",
        attribute: "sense",
        maxHp: 1150,
        pattern: [
          { type: "attack", value: 20, label: "烈風句 20" },
          { type: "curse_f", value: 1, label: "言葉詰まり（不+1）" },
          { type: "heavy_attack", value: 26, label: "修辞連撃 26" },
        ],
      },
    ],
    boss: {
      id: "boss_fortress",
      name: "堅牢なる論理要塞",
      title: "第二層守護者",
      spriteId: "dragon",
      attribute: "logic",
      maxHp: 6500,
      isBoss: true,
      gimmickType: "combo_armor",
      gimmickDesc: "絶対連撃壁：1ターン3枚目まで45%軽減。4枚目以降の連撃で打ち砕け",
      pattern: [
        { type: "defend", value: 110, label: "絶対論理障壁 +110" },
        { type: "attack", value: 24, label: "論破の光弾 24" },
        { type: "buff", value: 8, label: "体系構築 ATK+8" },
        { type: "heavy_attack", value: 38, label: "完全帰結砲 38" },
      ],
    },
  },
  {
    id: "stage_3",
    name: "第三層：文豪の深淵",
    subtitle: "底知れぬ耐久を誇る異界の言葉たち。研ぎ澄ました乗算の極致で貫け。",
    recommendedPower: "上級（乗算・再発動の備え推奨）",
    totalFloors: 7,
    baseHpScale: 6,
    enemies: [
      {
        id: "phantom_ink",
        name: "墨染めの亡霊",
        title: "推敲されし怨念",
        spriteId: "wisp",
        attribute: "sense",
        maxHp: 3400,
        gimmickType: "heavy_dampen",
        gimmickDesc: "重圧耐性：コスト2以上の攻撃を40%軽減",
        pattern: [
          { type: "attack", value: 24, label: "墨飛沫 24" },
          { type: "curse_f", value: 2, label: "誤字呪詛（不+2）" },
          { type: "heavy_attack", value: 36, label: "抹消の刃 36" },
        ],
      },
      {
        id: "dragon_syntax",
        name: "文脈竜・キメラ",
        title: "四属性の融合獣",
        spriteId: "dragon",
        attribute: "emotion",
        maxHp: 7200,
        isElite: true,
        gimmickType: "curse_aura",
        gimmickDesc: "口癖汚染：開戦時、捨札に『不』を1枚混ぜる",
        pattern: [
          { type: "buff", value: 10, label: "龍脈覚醒 ATK+10" },
          { type: "heavy_attack", value: 40, label: "激昂の咆哮 40" },
          { type: "defend", value: 160, label: "言葉の鱗 +160" },
        ],
      },
    ],
    boss: {
      id: "boss_bungo",
      name: "深淵の言霊神",
      title: "最終守護者",
      spriteId: "overlord",
      attribute: "logic",
      maxHp: 65000,
      isBoss: true,
      gimmickType: "combo_armor",
      gimmickDesc: "深淵障壁：1ターン3枚目まで45%軽減。軽量カードの連打から大技へ繋げ",
      pattern: [
        { type: "defend", value: 320, label: "森羅万象の盾 +320" },
        { type: "attack", value: 30, label: "神罰の句 30" },
        { type: "curse_f", value: 2, label: "沈黙の呪い（不+2）" },
        { type: "heavy_attack", value: 48, label: "天地開闢 48" },
      ],
    },
  },
];

const ENDLESS_SPRITES = ["slime", "wisp", "oni", "knight", "golem", "tengu", "dragon", "overlord"];
const ENDLESS_ATTRS: Attribute[] = ["logic", "emotion", "sense", "matter"];

/**
 * Generates an enemy for Endless (無間) floors above the stage boss.
 * HP scales exponentially so blue-sky builds can keep pushing limits.
 */
export function generateEndlessEnemy(floor: number, baseHp: number, rng: () => number): EnemyDef {
  const endlessDepth = Math.max(1, floor);
  const spriteId = ENDLESS_SPRITES[Math.floor(rng() * ENDLESS_SPRITES.length)];
  const attribute = ENDLESS_ATTRS[Math.floor(rng() * ENDLESS_ATTRS.length)];

  // Smooth exponential HP scaling so builds face escalating pressure without instant brick walls
  const anchor = Math.max(baseHp, 3500);
  const rawHp = anchor * Math.pow(2.35, endlessDepth);
  const hp = Number.isFinite(rawHp) ? Math.min(1e300, Math.floor(rawHp)) : 1e300;
  const atkScale = Math.min(
    260,
    Math.floor(22 + endlessDepth * 4 + Math.pow(endlessDepth, 1.25))
  );
  const isBoss = endlessDepth % 3 === 0;

  return {
    id: `endless_${endlessDepth}_${spriteId}`,
    name: isBoss ? `無間の主` : `深淵の言葉`,
    title: `無間 ${endlessDepth}層目`,
    spriteId: isBoss ? "overlord" : spriteId,
    attribute,
    maxHp: hp,
    isBoss,
    gimmickType: isBoss
      ? "combo_armor"
      : endlessDepth % 3 === 1
        ? "heavy_dampen"
        : undefined,
    gimmickDesc: isBoss
      ? "無間障壁：1ターン3枚目まで45%軽減。手数と乗算を重ねて貫け"
      : endlessDepth % 3 === 1
        ? "重圧耐性：コスト2以上の攻撃を40%軽減"
        : undefined,
    pattern: [
      { type: "attack", value: atkScale, label: `深淵撃 ${atkScale}` },
      { type: "defend", value: Math.min(1e298, Math.floor(hp * 0.05)), label: `虚無障壁` },
      { type: "curse_f", value: isBoss ? 2 : 1, label: `侵食（不+${isBoss ? 2 : 1}）` },
      { type: "heavy_attack", value: Math.floor(atkScale * 1.4), label: `崩壊の一太刀 ${Math.floor(atkScale * 1.4)}` },
    ],
  };
}
