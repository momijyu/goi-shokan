"use client";

import { ATTR_META, RANK_META, type Attribute, type Rank } from "@/types/game";

export function AttributeGuideBar() {
  return (
    <div className="space-y-2.5 border border-[#2A241E] bg-[#0B0A0E] px-3 py-2.5">
      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-bold text-[#A89262]">
            枠の色＝属性の意味・バトル効果
          </span>
          <span className="font-sans text-[11px] text-[#968E7E]">
            同属性を連続で使うと『雪だるま式』等の遺物シナジーが発動
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          {(["emotion", "sense", "logic", "matter"] as Attribute[]).map((attr) => {
            const meta = ATTR_META[attr];
            return (
              <div
                key={attr}
                style={{ borderColor: meta.border, backgroundColor: meta.tintBg }}
                className="flex items-center gap-2 border px-2.5 py-1.5 text-xs"
              >
                <span
                  style={{ color: meta.color }}
                  className="shrink-0 font-serif font-extrabold"
                >
                  {meta.label}
                </span>
                <span className="text-[11px] text-[#DCD4C2]">
                  {meta.battleEffect}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rarity Legend */}
      <div className="border-t border-[#242028] pt-2">
        <div className="mb-1 font-mono text-[11px] font-bold text-[#A89262]">
          枠の装飾＝レア度（低 → 高 / 特殊）
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["F", "N", "R", "SR", "SSR", "UR"] as Rank[]).map((r) => {
            const meta = RANK_META[r];
            return (
              <span
                key={r}
                style={{
                  color: meta.color,
                  backgroundColor: meta.bg,
                  borderColor: meta.border,
                  borderStyle: r === "F" ? "dashed" : "solid",
                }}
                className="inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-bold"
              >
                <span className="font-mono text-[10px]">{meta.pips}</span>
                <span className="font-serif">{meta.kanji}</span>
                <span className="font-sans text-[10px] font-normal opacity-85">
                  ({meta.label}
                  {r === "F"
                    ? "・破線"
                    : r === "SR"
                      ? "・銀角"
                      : r === "SSR"
                        ? "・金箔"
                        : r === "UR"
                          ? "・未知語"
                          : ""}
                  )
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
