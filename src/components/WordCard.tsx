"use client";

import {
  ATTR_META,
  getEffectiveStats,
  RANK_META,
  SKILL_META,
  type WordMasterEntry,
} from "@/types/game";
import { Shield, Sword } from "lucide-react";

interface WordCardProps {
  word: WordMasterEntry;
  effectiveCost?: number;
  plusLevel?: number;
  selected?: boolean;
  disabled?: boolean;
  isTemporaryTrial?: boolean;
  compact?: boolean;
  mini?: boolean;
  badgeText?: string;
  inDeck?: boolean;
  isAce?: boolean;
  dimUnselected?: boolean;
  disableLift?: boolean;
  className?: string;
  onClick?: () => void;
}

export function WordCard({
  word,
  effectiveCost,
  plusLevel = 0,
  selected = false,
  disabled = false,
  isTemporaryTrial = false,
  compact = false,
  mini = false,
  badgeText,
  inDeck = false,
  isAce = false,
  dimUnselected = false,
  disableLift = false,
  className = "",
  onClick,
}: WordCardProps) {
  const rankMeta = RANK_META[word.rank];
  const attrMeta = ATTR_META[word.attribute];
  const skillMeta = SKILL_META[word.skillType];
  const displayCost = effectiveCost ?? word.cost;
  const stats = getEffectiveStats(word, plusLevel);

  const isHighTier = word.rank === "SSR" || word.rank === "UR";
  const hasCorners = word.rank === "SR" || isHighTier;
  const cornerColor =
    word.rank === "SSR"
      ? "#F4D06F"
      : word.rank === "UR"
        ? "#E05A47"
        : "#C9BFA8";

  const borderColor = selected ? "#D4AF37" : attrMeta.border;

  const topTag =
    badgeText ??
    (isTemporaryTrial
      ? "お試し"
      : isAce
        ? "★ エース"
        : inDeck
          ? "✓ 辞書IN"
          : undefined);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        borderColor,
        backgroundColor: attrMeta.tintBg,
        borderStyle: word.rank === "F" ? "dashed" : "solid",
        borderWidth: isHighTier ? "2px" : "1px",
        boxShadow: selected
          ? `0 0 0 2px #D4AF37, 0 8px 20px ${attrMeta.glow}`
          : isAce
            ? "0 0 0 2px #D4AF37"
            : inDeck
              ? "0 0 0 1px rgba(110,231,183,0.75)"
              : word.rank === "SSR"
                ? "inset 0 0 18px rgba(244, 208, 111, 0.12)"
                : word.rank === "UR"
                  ? "inset 0 0 18px rgba(224, 90, 71, 0.16)"
                  : undefined,
      }}
      className={`group relative flex min-w-0 flex-col justify-between overflow-hidden text-left transition-all duration-150 ${
        mini
          ? "px-1 py-1.5"
          : compact
            ? className
              ? "p-1.5 sm:p-2.5"
              : "h-[7.375rem] p-1.5 sm:h-[8.75rem] sm:p-2.5"
            : "h-[14.625rem] p-2.5 sm:h-[15.25rem] sm:p-3"
      } ${
        dimUnselected && !inDeck && !isAce ? "opacity-65 hover:opacity-100" : ""
      } ${
        disableLift
          ? ""
          : selected
            ? "-translate-y-2"
            : "hover:-translate-y-0.5 hover:brightness-110"
      } ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"} ${className}`}
    >
      {/* Subtle diagonal metallic sheen for 極 (SSR) / 異 (UR) */}
      {isHighTier && (
        <span
          aria-hidden="true"
          style={{
            background:
              word.rank === "SSR"
                ? "linear-gradient(125deg, transparent 30%, rgba(244,208,111,0.12) 48%, transparent 65%)"
                : "linear-gradient(125deg, transparent 30%, rgba(224,90,71,0.16) 48%, transparent 65%)",
          }}
          className="pointer-events-none absolute inset-0"
        />
      )}

      {/* Corner ornaments by Rarity: SR (Platinum), SSR (Gold), UR (Crimson) */}
      {hasCorners && (
        <>
          <span
            aria-hidden="true"
            style={{ borderColor: cornerColor }}
            className="pointer-events-none absolute top-0 left-0 h-2.5 w-2.5 border-t-2 border-l-2"
          />
          <span
            aria-hidden="true"
            style={{ borderColor: cornerColor }}
            className="pointer-events-none absolute top-0 right-0 h-2.5 w-2.5 border-t-2 border-r-2"
          />
          <span
            aria-hidden="true"
            style={{ borderColor: cornerColor }}
            className="pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5 border-b-2 border-l-2"
          />
          <span
            aria-hidden="true"
            style={{ borderColor: cornerColor }}
            className="pointer-events-none absolute right-0 bottom-0 h-2.5 w-2.5 border-r-2 border-b-2"
          />
        </>
      )}

      {/* Status ribbon inside top edge */}
      {topTag && (
        <div
          className={`relative z-10 -mx-1 -mt-1 mb-1.5 flex items-center justify-center px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider ${
            isAce
              ? "bg-[#382C11] text-[#F4D06F]"
              : inDeck
                ? "bg-[#173629] text-[#6EE7B7]"
                : "bg-[#2C1B1A] text-[#F2D06B]"
          }`}
        >
          {topTag}
        </div>
      )}

      {/* Header: Cost + Plus + Rarity Pips & Hanko Seal */}
      <div className="relative z-10 flex items-center justify-between gap-0.5">
        <span
          className={`inline-flex items-center justify-center border border-[#6E5D42] bg-[#0B0A0E] font-mono font-bold text-[#F2ECE0] ${
            mini
              ? "h-4 w-4 text-[10px]"
              : compact
                ? "h-5 w-5 text-xs"
                : "h-6 w-6 text-xs"
          }`}
          title="コスト"
        >
          {displayCost}
        </span>

        <div className="flex items-center gap-0.5">
          {stats.plusLevel > 0 && (
            <span
              className={`border border-[#5A4722] bg-[#1E170A] font-mono font-bold leading-none text-[#E3B94E] ${
                mini ? "px-0.5 py-0.5 text-[9px]" : "px-1 py-0.5 text-[10px]"
              }`}
            >
              +{stats.plusLevel}
            </span>
          )}
          <div
            style={{
              color: rankMeta.color,
              backgroundColor: rankMeta.bg,
              borderColor: rankMeta.border,
            }}
            className={`inline-flex items-center gap-1 border font-serif font-extrabold leading-none ${
              mini
                ? "h-4 px-1 text-[10px]"
                : compact
                  ? "h-5 px-1.5 text-[11px]"
                  : "h-6 px-1.5 text-xs"
            }`}
            title={`レア度：${rankMeta.label}（${rankMeta.kanji}）`}
          >
            {!compact && !mini && (
              <span className="font-mono text-[9px] tracking-tighter opacity-90">
                {rankMeta.pips}
              </span>
            )}
            <span>{rankMeta.kanji}</span>
          </div>
        </div>
      </div>

      {/* Center: Term + Reading + Attribute + Skill Summary */}
      <div className="relative z-10 my-1 flex min-h-0 flex-1 flex-col justify-center">
        <div className="text-center">
          <div
            className={`font-serif font-extrabold tracking-tight text-[#F7F3EA] break-words leading-tight line-clamp-2 ${
              mini
                ? word.term.length >= 4
                  ? "text-[11px]"
                  : "text-[13px]"
                : word.term.length >= 4
                  ? compact
                    ? "text-xs sm:text-sm"
                    : "text-base"
                  : compact
                    ? "text-sm sm:text-base"
                    : "text-lg"
            }`}
          >
            {word.term}
          </div>
          {mini && (
            <div
              style={{ color: attrMeta.color }}
              className="mt-0.5 font-serif text-[9px] font-bold leading-none opacity-90"
            >
              {attrMeta.label}
            </div>
          )}
          {!compact && !mini && (
            <div className="mt-0.5 truncate font-sans text-[11px] text-[#A89F8E]">
              {word.reading}
            </div>
          )}
        </div>

        {!compact && !mini && (
          <div className="mt-2 space-y-1 border-t border-white/10 pt-1.5">
            <div className="flex items-center justify-between gap-1">
              <span
                style={{ color: attrMeta.color }}
                className="truncate font-serif text-[11px] font-bold"
              >
                {attrMeta.label}
                <span className="ml-1 font-mono text-[10px] opacity-85">
                  [{attrMeta.roleHint}]
                </span>
              </span>
              <span
                style={{ color: skillMeta.color }}
                className="shrink-0 border border-[#2E2822] bg-[#0B0A0E] px-1.5 py-0.5 font-mono text-[10px] font-bold"
              >
                {skillMeta.shortTag}
              </span>
            </div>
            <p className="line-clamp-3 text-[10.5px] leading-snug text-[#CFC8B8] break-words">
              {word.skillDesc}
            </p>
          </div>
        )}
      </div>

      {/* Footer: Attribute / Rarity pips (compact) + Bold ATK / DEF */}
      {mini ? (
        <div className="relative z-10 flex items-center justify-between gap-0.5 border-t border-white/10 pt-1 font-mono text-[9.5px] font-bold">
          <span className="inline-flex items-center gap-0.5 text-[#F07167]">
            <Sword className="h-2.5 w-2.5 shrink-0" />
            {stats.atk}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[#69A3D9]">
            <Shield className="h-2.5 w-2.5 shrink-0" />
            {stats.def}
          </span>
        </div>
      ) : (
        <div className="relative z-10 flex items-center justify-between gap-1 border-t border-white/10 pt-1.5">
          {compact ? (
            <div className="flex min-w-0 items-center gap-1">
              <span
                style={{ color: attrMeta.color }}
                className="shrink-0 font-serif text-[11px] font-bold"
              >
                {attrMeta.kanji}
              </span>
              <span
                style={{ color: rankMeta.color }}
                className="hidden truncate font-mono text-[9px] tracking-tighter opacity-90 sm:inline"
              >
                {rankMeta.pips}
              </span>
            </div>
          ) : (
            <span style={{ color: rankMeta.color }} className="font-mono text-[10px] font-bold">
              {rankMeta.label}
            </span>
          )}
          <div
            className={`flex shrink-0 items-center font-mono font-bold ${
              compact ? "gap-1 text-[10px] sm:gap-1.5 sm:text-[11px]" : "gap-2.5 text-xs"
            }`}
          >
            <span className="inline-flex items-center gap-0.5 text-[#F07167]">
              <Sword className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              {stats.atk}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[#69A3D9]">
              <Shield className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              {stats.def}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
