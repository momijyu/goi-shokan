"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Crown, LayoutGrid, Plus, Rows3, Shield, Sword, X } from "lucide-react";
import { AttributeGuideBar } from "@/components/AttributeGuideBar";
import { useSaveData } from "@/components/GameShell";
import { WordCard } from "@/components/WordCard";
import { WordDetailDialog } from "@/components/WordDetailDialog";
import {
  filterAndSortWords,
  WordFilterBar,
  type WordFilterState,
} from "@/components/WordFilterBar";
import { updateDeckPoolInSave } from "@/lib/storage";
import {
  ATTR_META,
  getEffectiveStats,
  RANK_META,
  SKILL_META,
  type Attribute,
  type OwnedWord,
} from "@/types/game";

export default function DeckPage() {
  const { save, setSave } = useSaveData();
  const [filter, setFilter] = useState<WordFilterState>({
    search: "",
    attr: "all",
    rank: "all",
    skill: "all",
    sort: "deck_first",
    onlyInDeck: false,
  });
  const [detailWord, setDetailWord] = useState<OwnedWord | null>(null);
  const [poolOpenMobile, setPoolOpenMobile] = useState(false);
  const [mobileTwoCol, setMobileTwoCol] = useState(true);

  const ownedList = Object.values(save.ownedWords);
  const deckPoolSet = new Set(save.deckPoolTerms);

  const poolWords = save.deckPoolTerms
    .map((t) => save.ownedWords[t])
    .filter((w): w is OwnedWord => Boolean(w));

  const aceWord = save.ownedWords[save.aceTerm] ?? poolWords[0] ?? ownedList[0];

  const filteredOwned = filterAndSortWords(
    ownedList,
    filter,
    deckPoolSet,
    save.aceTerm
  );

  const handleTogglePool = (term: string) => {
    const exists = deckPoolSet.has(term);
    if (exists) {
      if (save.deckPoolTerms.length <= 6) return;
      const nextPool = save.deckPoolTerms.filter((t) => t !== term);
      const nextAce = save.aceTerm === term ? nextPool[0] : save.aceTerm;
      setSave(updateDeckPoolInSave(save, nextPool, nextAce));
    } else {
      if (save.deckPoolTerms.length >= 30) return;
      setSave(updateDeckPoolInSave(save, [...save.deckPoolTerms, term], save.aceTerm));
    }
  };

  const handleSetAce = (term: string) => {
    let nextPool = save.deckPoolTerms;
    if (!nextPool.includes(term)) {
      if (nextPool.length >= 30) {
        nextPool = [...nextPool.slice(0, 29), term];
      } else {
        nextPool = [...nextPool, term];
      }
    }
    setSave(updateDeckPoolInSave(save, nextPool, term));
  };

  const attrCounts: Record<Attribute, number> = {
    logic: 0,
    emotion: 0,
    sense: 0,
    matter: 0,
  };
  for (const w of poolWords) {
    attrCounts[w.attribute] += 1;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="kaku-frame p-3 sm:p-5">
        <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-end sm:gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-[#A89262] sm:text-[11px]">
              DROP POOL CONFIGURATION
            </p>
            <h1 className="mt-0.5 font-serif text-xl font-extrabold text-[#F7F3EA] sm:mt-1 sm:text-2xl">
              マイ辞書 ＆ エース編成
            </h1>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#CFC8B8] sm:mt-1 sm:text-xs">
              緑枠「辞書IN」（6〜30枚）がドロップ候補になり、金枠「エース」1枚が初期手札に必ず加わります。
            </p>
          </div>
          <Link
            href="/dungeon"
            className="inline-flex shrink-0 items-center justify-center border border-[#C93A2B] bg-[#291112] px-4 py-2 font-serif text-xs font-bold text-[#F7F3EA] hover:bg-[#C93A2B] sm:px-5 sm:py-2.5 sm:text-sm"
          >
            この辞書で迷宮へ
          </Link>
        </div>
      </section>

      {/* Ace + Current Pool Summary */}
      <div className="grid gap-3 md:grid-cols-[220px_1fr] md:gap-4">
        <div className="border border-[#D4AF37] bg-[#19150E] p-2.5 sm:p-3">
          <div className="mb-1.5 flex items-center gap-1.5 font-mono text-xs font-bold text-[#F4D06F] sm:mb-2">
            <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>持ち込みエース（1枚）</span>
          </div>
          {/* Mobile Compact Ace Bar */}
          {aceWord && (() => {
            const aceStats = getEffectiveStats(aceWord, aceWord.obtainCount);
            const aceAttr = ATTR_META[aceWord.attribute];
            const aceRank = RANK_META[aceWord.rank];
            const aceSkill = SKILL_META[aceWord.skillType];
            return (
              <button
                type="button"
                onClick={() => setDetailWord(aceWord)}
                style={{
                  borderColor: aceAttr.border,
                  backgroundColor: aceAttr.tintBg,
                }}
                className="flex w-full items-center justify-between gap-2 border px-2.5 py-2 text-left md:hidden"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    style={{
                      color: aceRank.color,
                      backgroundColor: aceRank.bg,
                      borderColor: aceRank.border,
                    }}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center border font-serif text-xs font-bold"
                  >
                    {aceRank.kanji}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-serif text-sm font-extrabold text-[#F7F3EA]">
                        {aceWord.term}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[#E3B94E]">
                        {aceWord.cost}コス
                      </span>
                    </div>
                    <p className="truncate text-[10px] text-[#CFC8B8]">
                      <span style={{ color: aceSkill.color }} className="mr-1 font-bold">
                        [{aceSkill.shortTag}]
                      </span>
                      {aceWord.skillDesc}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end font-mono text-[10px] font-bold">
                  <span className="inline-flex items-center gap-0.5 text-[#F07167]">
                    <Sword className="h-2.5 w-2.5" />
                    {aceStats.atk}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[#69A3D9]">
                    <Shield className="h-2.5 w-2.5" />
                    {aceStats.def}
                  </span>
                </div>
              </button>
            );
          })()}
          {/* PC Full Ace Card */}
          {aceWord && (
            <div className="hidden md:block">
              <WordCard
                word={aceWord}
                isAce
                onClick={() => setDetailWord(aceWord)}
              />
            </div>
          )}
        </div>

        <div className="space-y-2.5 border border-[#2E2822] bg-[#121016] p-3 sm:space-y-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-sm font-bold text-[#F7F3EA] sm:text-base">
              現在のマイ辞書（選択中）
            </h2>
            <span className="font-mono text-xs font-bold text-[#6EE7B7] sm:text-sm">
              {poolWords.length} / 30 枚（最低6枚）
            </span>
          </div>

          {/* Attribute distribution (1 single clean row on mobile!) */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {(["logic", "emotion", "sense", "matter"] as Attribute[]).map((attr) => {
              const meta = ATTR_META[attr];
              return (
                <div
                  key={attr}
                  className="flex flex-col items-center justify-between border border-[#2A241E] bg-[#0B0A0E] px-1.5 py-1 text-[11px] sm:flex-row sm:px-3 sm:py-1.5 sm:text-xs"
                >
                  <span style={{ color: meta.color }} className="font-serif font-bold">
                    {meta.label}
                  </span>
                  <span className="font-mono font-bold text-[#F2ECE0]">
                    {attrCounts[attr]}枚
                  </span>
                </div>
              );
            })}
          </div>

          {/* Mobile Accordion Toggle for Selected Pool Chips */}
          <button
            type="button"
            onClick={() => setPoolOpenMobile((prev) => !prev)}
            className="flex w-full items-center justify-between border border-[#2A241E] bg-[#0B0A0E] px-2.5 py-1.5 font-mono text-[11px] text-[#CFC8B8] md:hidden"
          >
            <span>選択中のカード一覧（{poolWords.length}枚）を確認・外す</span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-[#8A7348] transition-transform ${
                poolOpenMobile ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Mobile Clean 2-Col Single-Line List (Aligned grid, no ATK/DEF clutter) */}
          {poolOpenMobile && (
            <div className="grid grid-cols-2 gap-1.5 md:hidden">
              {poolWords.map((w) => {
                const rankMeta = RANK_META[w.rank];
                const attrMeta = ATTR_META[w.attribute];
                const isAce = w.term === save.aceTerm;
                return (
                  <div
                    key={w.term}
                    style={{
                      borderColor: isAce ? "#D4AF37" : "#2A241E",
                      borderLeftColor: isAce ? "#D4AF37" : attrMeta.border,
                    }}
                    className="flex min-w-0 items-center justify-between gap-1 border border-l-2 bg-[#0F0D14] px-2 py-1 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setDetailWord(w)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    >
                      <span
                        style={{
                          color: rankMeta.color,
                          backgroundColor: rankMeta.bg,
                          borderColor: rankMeta.border,
                        }}
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center border font-serif text-[10px] font-bold leading-none"
                      >
                        {rankMeta.kanji}
                      </span>
                      <span className="truncate font-serif text-xs font-bold text-[#F2ECE0]">
                        {w.term}
                      </span>
                      {isAce && <Crown className="h-3 w-3 shrink-0 text-[#E3B94E]" />}
                    </button>
                    {poolWords.length > 6 && (
                      <button
                        type="button"
                        onClick={() => handleTogglePool(w.term)}
                        title="マイ辞書から外す"
                        className="shrink-0 p-0.5 text-[#787166] hover:text-[#E05A47]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* PC Readable Selected Pool Chips (Always open on PC) */}
          <div className="hidden gap-1.5 md:grid md:grid-cols-2 lg:grid-cols-3">
            {poolWords.map((w) => {
              const stats = getEffectiveStats(w, w.obtainCount);
              const rankMeta = RANK_META[w.rank];
              const skillMeta = SKILL_META[w.skillType];
              const isAce = w.term === save.aceTerm;
              return (
                <div
                  key={w.term}
                  style={{
                    borderColor: isAce ? "#D4AF37" : ATTR_META[w.attribute].border,
                    backgroundColor: ATTR_META[w.attribute].tintBg,
                  }}
                  className="flex min-w-0 items-center justify-between gap-2 border px-2.5 py-1.5 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => setDetailWord(w)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span
                      style={{
                        color: rankMeta.color,
                        backgroundColor: rankMeta.bg,
                        borderColor: rankMeta.border,
                      }}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center border font-serif text-[11px] font-bold"
                    >
                      {rankMeta.kanji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate font-serif font-bold text-[#F2ECE0]">
                          {w.term}
                        </span>
                        {isAce && <Crown className="h-3 w-3 shrink-0 text-[#E3B94E]" />}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="inline-flex items-center gap-0.5 text-[#F07167]">
                          <Sword className="h-2.5 w-2.5" />
                          {stats.atk}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[#69A3D9]">
                          <Shield className="h-2.5 w-2.5" />
                          {stats.def}
                        </span>
                        <span
                          style={{ color: skillMeta.color }}
                          className="truncate"
                        >
                          {skillMeta.shortTag}
                        </span>
                      </div>
                    </div>
                  </button>

                  {poolWords.length > 6 && (
                    <button
                      type="button"
                      onClick={() => handleTogglePool(w.term)}
                      title="マイ辞書から外す"
                      className="shrink-0 p-1 text-[#8E8678] hover:text-[#E05A47]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter & Sort + Full Owned Grid */}
      <section className="space-y-3 border border-[#2E2822] bg-[#121016] p-3 sm:space-y-4 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-base font-bold text-[#F7F3EA] sm:text-lg">
              所持語彙一覧（{filteredOwned.length} / {ownedList.length}種）
            </h2>
            <span className="font-mono text-[10px] text-[#A89F8E] sm:text-xs">
              緑枠＝辞書IN ／ 金枠＝エース（タップで詳細）
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMobileTwoCol((prev) => !prev)}
            className="inline-flex items-center gap-1 border border-[#3A332A] bg-[#0B0A0E] px-2.5 py-1 font-mono text-[11px] text-[#E3B94E] sm:hidden"
          >
            {mobileTwoCol ? (
              <>
                <Rows3 className="h-3.5 w-3.5" />
                <span>1列表示に切替</span>
              </>
            ) : (
              <>
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>2列表示に切替</span>
              </>
            )}
          </button>
        </div>

        <AttributeGuideBar />

        <WordFilterBar
          value={filter}
          onChange={setFilter}
          showDeckOnlyToggle
          showDeckSort
        />

        {filteredOwned.length === 0 ? (
          <div className="border border-[#2A241E] bg-[#0B0A0E] py-10 text-center text-xs text-[#968E7E]">
            条件に一致する語彙がありません。フィルタを緩めてみてください。
          </div>
        ) : (
          <div
            className={`grid gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5 ${
              mobileTwoCol ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {filteredOwned.map((w) => {
              const inPool = deckPoolSet.has(w.term);
              const isAce = save.aceTerm === w.term;
              return (
                <div key={w.term} className="flex min-w-0 flex-col gap-1.5">
                  <WordCard
                    word={w}
                    inDeck={inPool}
                    isAce={isAce}
                    dimUnselected={!inPool}
                    className={mobileTwoCol ? "min-h-[168px] p-2 sm:min-h-[200px] sm:p-3" : ""}
                    onClick={() => setDetailWord(w)}
                  />
                  <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTogglePool(w.term)}
                      className={`flex min-w-0 items-center justify-center gap-1 border py-1.5 font-mono text-[11px] font-bold transition-colors sm:text-xs ${
                        inPool
                          ? "border-[#4EB887] bg-[#173629] text-[#6EE7B7]"
                          : "border-[#3A332A] bg-[#0B0A0E] text-[#CFC8B8] hover:border-[#8A7348] hover:text-[#ECE6D8]"
                      }`}
                    >
                      {inPool ? (
                        <>
                          <Check className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                          <span className="truncate">辞書IN</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                          <span className="truncate">追加</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAce(w.term)}
                      className={`flex min-w-0 items-center justify-center gap-1 border py-1.5 font-mono text-[11px] font-bold transition-colors sm:text-xs ${
                        isAce
                          ? "border-[#D4AF37] bg-[#382C11] text-[#F4D06F]"
                          : "border-[#3A332A] bg-[#0B0A0E] text-[#A89F8E] hover:border-[#D4AF37] hover:text-[#F4D06F]"
                      }`}
                    >
                      <Crown className="h-3 w-3 shrink-0" />
                      <span className="truncate">{isAce ? "エース中" : "エース"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <WordDetailDialog
        word={detailWord}
        open={Boolean(detailWord)}
        onOpenChange={(open) => !open && setDetailWord(null)}
        actionButton={
          detailWord ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTogglePool(detailWord.term)}
                className="border border-[#3A332A] bg-[#1A1620] py-2 text-xs font-bold text-[#ECE6D8] hover:border-[#8A7348]"
              >
                {deckPoolSet.has(detailWord.term)
                  ? "マイ辞書から外す"
                  : "マイ辞書に追加"}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSetAce(detailWord.term);
                  setDetailWord(null);
                }}
                className="border border-[#D4AF37] bg-[#261E0E] py-2 text-xs font-bold text-[#E3B94E]"
              >
                エースに設定
              </button>
            </div>
          ) : null
        }
      />
    </div>
  );
}
