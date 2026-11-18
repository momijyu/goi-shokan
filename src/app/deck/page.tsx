"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Crown, Plus, Shield, Sword, X } from "lucide-react";
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
    <div className="space-y-6">
      <section className="kaku-frame p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[11px] tracking-[0.22em] text-[#A89262]">
              DROP POOL CONFIGURATION
            </p>
            <h1 className="mt-1 font-serif text-2xl font-extrabold text-[#F7F3EA]">
              マイ辞書 ＆ エース編成
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-[#CFC8B8]">
              緑枠「辞書IN」のカード（6〜30枚）が迷宮のドロップ候補になり、金枠「エース」1枚が初期手札に必ず加わります。
            </p>
          </div>
          <Link
            href="/dungeon"
            className="inline-flex shrink-0 items-center justify-center border border-[#C93A2B] bg-[#291112] px-5 py-2.5 font-serif text-sm font-bold text-[#F7F3EA] hover:bg-[#C93A2B]"
          >
            この辞書で迷宮へ
          </Link>
        </div>
      </section>

      {/* Ace + Current Pool Summary */}
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="border border-[#D4AF37] bg-[#19150E] p-3">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-xs font-bold text-[#F4D06F]">
            <Crown className="h-4 w-4" />
            <span>持ち込みエース（1枚）</span>
          </div>
          {aceWord && (
            <WordCard
              word={aceWord}
              isAce
              onClick={() => setDetailWord(aceWord)}
            />
          )}
        </div>

        <div className="border border-[#2E2822] bg-[#121016] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-base font-bold text-[#F7F3EA]">
              現在のマイ辞書（選択中）
            </h2>
            <span className="font-mono text-sm font-bold text-[#6EE7B7]">
              {poolWords.length} / 30 枚（最低6枚）
            </span>
          </div>

          {/* Attribute distribution */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["logic", "emotion", "sense", "matter"] as Attribute[]).map((attr) => {
              const meta = ATTR_META[attr];
              return (
                <div
                  key={attr}
                  className="flex items-center justify-between border border-[#2A241E] bg-[#0B0A0E] px-3 py-1.5 text-xs"
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

          {/* Readable Selected Pool Chips */}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="flex items-center justify-between gap-2 border px-2.5 py-1.5 text-xs"
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
                        <span className="text-[#F07167] inline-flex items-center gap-0.5">
                          <Sword className="h-2.5 w-2.5" />
                          {stats.atk}
                        </span>
                        <span className="text-[#69A3D9] inline-flex items-center gap-0.5">
                          <Shield className="h-2.5 w-2.5" />
                          {stats.def}
                        </span>
                        <span style={{ color: skillMeta.color }}>
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
      <section className="border border-[#2E2822] bg-[#121016] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg font-bold text-[#F7F3EA]">
            所持語彙一覧（表示中 {filteredOwned.length} / 全 {ownedList.length}種）
          </h2>
          <span className="font-mono text-xs text-[#A89F8E]">
            緑枠＝辞書IN ／ 金枠＝エース
          </span>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {filteredOwned.map((w) => {
              const inPool = deckPoolSet.has(w.term);
              const isAce = save.aceTerm === w.term;
              return (
                <div key={w.term} className="flex flex-col gap-1.5">
                  <WordCard
                    word={w}
                    inDeck={inPool}
                    isAce={isAce}
                    dimUnselected={!inPool}
                    onClick={() => setDetailWord(w)}
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTogglePool(w.term)}
                      className={`flex items-center justify-center gap-1 border py-1.5 font-mono text-xs font-bold transition-colors ${
                        inPool
                          ? "border-[#4EB887] bg-[#173629] text-[#6EE7B7]"
                          : "border-[#3A332A] bg-[#0B0A0E] text-[#CFC8B8] hover:border-[#8A7348] hover:text-[#ECE6D8]"
                      }`}
                    >
                      {inPool ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>辞書IN</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>追加</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAce(w.term)}
                      className={`flex items-center justify-center gap-1 border py-1.5 font-mono text-xs font-bold transition-colors ${
                        isAce
                          ? "border-[#D4AF37] bg-[#382C11] text-[#F4D06F]"
                          : "border-[#3A332A] bg-[#0B0A0E] text-[#A89F8E] hover:border-[#D4AF37] hover:text-[#F4D06F]"
                      }`}
                    >
                      <Crown className="h-3 w-3" />
                      <span>{isAce ? "エース中" : "エース"}</span>
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
