"use client";

import type { MinedCardResult } from "@/lib/analyzer";
import { formatJapaneseNumber } from "@/lib/bignum";
import {
  ATTR_META,
  RANK_META,
  SKILL_META,
  type Rank,
} from "@/types/game";

const RANK_ORDER: Record<Rank, number> = {
  UR: 6,
  SSR: 5,
  SR: 4,
  R: 3,
  N: 2,
  F: 1,
};

export function getShareSiteUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function openXShareIntent(text: string, includeUrl = true): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams({ text });
  if (includeUrl) {
    const siteUrl = getShareSiteUrl();
    if (siteUrl && !siteUrl.includes("localhost")) {
      params.set("url", siteUrl);
    }
  }
  const intentUrl = `https://x.com/intent/tweet?${params.toString()}`;
  window.open(intentUrl, "_blank", "noopener,noreferrer");
}

export function buildMiningShareText(
  pack: MinedCardResult[],
  totalExtractedWords: number
): string {
  const sorted = [...pack].sort(
    (a, b) => RANK_ORDER[b.entry.rank] - RANK_ORDER[a.entry.rank]
  );
  const topLabels = sorted
    .slice(0, 3)
    .map((c) => `【${RANK_META[c.entry.rank].kanji}：${c.entry.term}】`)
    .join("");
  const hasUR = sorted.some((c) => c.entry.rank === "UR");
  const hasF = sorted.some((c) => c.entry.rank === "F");
  const hook = hasUR
    ? "未知語『異』が出た！"
    : hasF
      ? "まさかの『不』ランク出現ｗ"
      : "文章から言霊カードを生成！";

  return `${hook}\n${topLabels} など${pack.length}枚を採掘（全${totalExtractedWords}語抽出）\n文章で戦うブラウザローグライク「語彙召喚(仮)」\n#語彙召喚 #ブラウザゲーム`;
}

export function buildRunShareText(params: {
  stageName: string;
  floor: number;
  maxDamage: number;
  cleared: boolean;
  relicCount: number;
}): string {
  const dmgText = formatJapaneseNumber(params.maxDamage).text;
  const statusText = params.cleared
    ? `『${params.stageName}』踏破！`
    : `『${params.stageName}』第${params.floor}階まで到達！`;
  return `${statusText}\n最大一撃【${dmgText}】／ 獲得遺物 ${params.relicCount}個\n文章からデッキを組むローグライク「語彙召喚(仮)」\n#語彙召喚 #ブラウザゲーム`;
}

function triggerCanvasPngDownload(canvas: HTMLCanvasElement, filename: string): void {
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function drawShareCardFrame(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Deep Obsidian Washi background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#0B0A0E");
  grad.addColorStop(0.5, "#141118");
  grad.addColorStop(1, "#0B0A0E");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Outer & Inner Gold Frame
  ctx.strokeStyle = "#8A7348";
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, width - 40, height - 40);
  ctx.strokeStyle = "#2E2822";
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, width - 64, height - 64);

  // Header branding
  ctx.fillStyle = "#A89262";
  ctx.font = "bold 18px monospace";
  ctx.fillText("GOI-SHOKAN(KARI) // 語彙召喚(仮)", 56, 74);
}

export function downloadMiningShareImage(
  pack: MinedCardResult[],
  totalExtractedWords: number
): void {
  if (typeof document === "undefined") return;
  const width = 1200;
  const height = 630;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  drawShareCardFrame(ctx, width, height);

  ctx.fillStyle = "#F7F3EA";
  ctx.font = "bold 36px serif";
  ctx.fillText("言霊採掘リザルト", 56, 126);

  ctx.fillStyle = "#CFC8B8";
  ctx.font = "22px monospace";
  ctx.fillText(`抽出語彙 ${totalExtractedWords}語 / ピックアップ ${pack.length}枚`, 56, 164);

  const cards = [...pack]
    .sort((a, b) => RANK_ORDER[b.entry.rank] - RANK_ORDER[a.entry.rank])
    .slice(0, 6);

  const cardW = 344;
  const cardH = 178;
  const startX = 56;
  const startY = 194;
  const gapX = 28;
  const gapY = 22;

  cards.forEach((item, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);
    const rankMeta = RANK_META[item.entry.rank];
    const attrMeta = ATTR_META[item.entry.attribute];
    const skillMeta = SKILL_META[item.entry.skillType];

    ctx.fillStyle = "#141218";
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeStyle = rankMeta.border;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, cardW, cardH);

    // Rank badge
    ctx.fillStyle = rankMeta.bg;
    ctx.fillRect(x + 14, y + 14, 38, 38);
    ctx.strokeStyle = rankMeta.border;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 14, y + 14, 38, 38);
    ctx.fillStyle = rankMeta.color;
    ctx.font = "bold 22px serif";
    ctx.fillText(rankMeta.kanji, x + 22, y + 41);

    // Term & attribute
    ctx.fillStyle = "#F7F3EA";
    ctx.font = "bold 24px serif";
    const term = item.entry.term.length > 9 ? `${item.entry.term.slice(0, 8)}…` : item.entry.term;
    ctx.fillText(term, x + 64, y + 41);

    ctx.fillStyle = attrMeta.color;
    ctx.font = "bold 16px monospace";
    ctx.fillText(`${attrMeta.label} / コスト${item.entry.cost}`, x + 16, y + 82);

    // ATK / DEF
    ctx.fillStyle = "#F07167";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`攻 ${item.entry.baseAtk}`, x + 16, y + 116);
    ctx.fillStyle = "#69A3D9";
    ctx.fillText(`防 ${item.entry.baseDef}`, x + 116, y + 116);

    // Skill short tag
    ctx.fillStyle = skillMeta.color;
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(`[${skillMeta.shortTag}]`, x + 16, y + 150);
  });

  ctx.fillStyle = "#8A7348";
  ctx.font = "18px monospace";
  ctx.fillText("自分の文章で戦う日本語語彙デッキ構築ローグライク #語彙召喚", 56, 584);

  triggerCanvasPngDownload(canvas, `goi-shokan-pack-${Date.now()}.png`);
}

export function downloadRunShareImage(params: {
  stageName: string;
  floor: number;
  maxDamage: number;
  cleared: boolean;
  relicCount: number;
  aceTerm: string;
}): void {
  if (typeof document === "undefined") return;
  const width = 1200;
  const height = 630;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  drawShareCardFrame(ctx, width, height);

  ctx.fillStyle = params.cleared ? "#F4D06F" : "#E05A47";
  ctx.font = "bold 24px monospace";
  ctx.fillText(
    params.cleared ? "STAGE CONQUERED // 迷宮踏破" : "EXPEDITION RECORD // 迷宮挑戦記録",
    56,
    126
  );

  ctx.fillStyle = "#F7F3EA";
  ctx.font = "bold 46px serif";
  ctx.fillText(params.stageName, 56, 186);

  // Main Damage Box
  ctx.fillStyle = "#16131C";
  ctx.fillRect(56, 224, 1088, 196);
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(56, 224, 1088, 196);

  ctx.fillStyle = "#A89262";
  ctx.font = "bold 22px monospace";
  ctx.fillText("MAX SINGLE HIT // 自己最高一撃出力", 88, 272);

  const dmgText = formatJapaneseNumber(params.maxDamage).text;
  ctx.fillStyle = "#F4D06F";
  ctx.font = "bold 76px monospace";
  ctx.fillText(dmgText, 88, 366);

  // Sub stats
  const boxes = [
    { label: "到達階層", val: `第${params.floor}階` },
    { label: "獲得遺物", val: `${params.relicCount}個` },
    { label: "相棒エース", val: params.aceTerm },
  ];
  boxes.forEach((b, i) => {
    const bx = 56 + i * 372;
    const by = 446;
    ctx.fillStyle = "#121016";
    ctx.fillRect(bx, by, 344, 100);
    ctx.strokeStyle = "#3A332A";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, 344, 100);

    ctx.fillStyle = "#968E7E";
    ctx.font = "18px monospace";
    ctx.fillText(b.label, bx + 20, by + 36);

    ctx.fillStyle = "#F2ECE0";
    ctx.font = "bold 30px serif";
    ctx.fillText(b.val, bx + 20, by + 78);
  });

  ctx.fillStyle = "#8A7348";
  ctx.font = "18px monospace";
  ctx.fillText("文章からデッキを組む日本語語彙ローグライク「語彙召喚(仮)」 #語彙召喚", 56, 586);

  triggerCanvasPngDownload(canvas, `goi-shokan-result-${Date.now()}.png`);
}
