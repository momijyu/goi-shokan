"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Check,
  ChevronDown,
  Crown,
  LayoutGrid,
  Plus,
  Rows3,
  Save,
  Shield,
  Sword,
  Trash2,
  X,
} from "lucide-react";
import { AttributeGuideBar } from "@/components/AttributeGuideBar";
import { useSaveData } from "@/components/GameShell";
import { WordCard } from "@/components/WordCard";
import { WordDetailDialog } from "@/components/WordDetailDialog";
import {
  filterAndSortWords,
  WordFilterBar,
  type WordFilterState,
} from "@/components/WordFilterBar";
import {
  applyDeckPresetInSave,
  deleteDeckPresetInSave,
  isPresetSyncedWithSave,
  MAX_DECK_PRESETS,
  saveDeckPresetInSave,
  updateDeckPoolInSave,
} from "@/lib/storage";
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
  const [poolOpenMobile, setPoolOpenMobile] = useState(true);
  const [mobileTwoCol, setMobileTwoCol] = useState(true);
  const [presetNameInput, setPresetNameInput] = useState("");
  const [presetsOpen, setPresetsOpen] = useState(true);

  const presets = save.deckPresets ?? [];
  const activePreset = presets.find((p) => p.id === save.activePresetId) ?? null;
  const isActivePresetModified = activePreset
    ? !isPresetSyncedWithSave(save, activePreset)
    : false;

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

  const handleSaveNewPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (presets.length >= MAX_DECK_PRESETS) return;
    setSave(saveDeckPresetInSave(save, { name: presetNameInput }));
    setPresetNameInput("");
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

      {/* Ace (PC left sidebar) + Current Pool Summary */}
      <div className="grid gap-3 md:grid-cols-[220px_1fr] md:gap-4">
        <div className="hidden border border-[#D4AF37] bg-[#19150E] p-3 md:block">
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

        <div className="space-y-2.5 border border-[#2E2822] bg-[#121016] p-3 sm:space-y-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-sm font-bold text-[#F7F3EA] sm:text-base">
              現在のマイ辞書（選択中）
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {aceWord && (
                <button
                  type="button"
                  onClick={() => setDetailWord(aceWord)}
                  className="inline-flex items-center gap-1 border border-[#8A7348] bg-[#261E0E] px-2 py-0.5 font-mono text-[10px] font-bold text-[#F4D06F] md:hidden"
                >
                  <Crown className="h-3 w-3 shrink-0" />
                  <span>エース：{aceWord.term}</span>
                </button>
              )}
              <span className="font-mono text-xs font-bold text-[#6EE7B7] sm:text-sm">
                {poolWords.length} / 30 枚（最低6枚）
              </span>
            </div>
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

          {/* Mobile Accordion Toggle for Selected Pool (Open by default so cards are immediately visible!) */}
          <button
            type="button"
            onClick={() => setPoolOpenMobile((prev) => !prev)}
            className="flex w-full items-center justify-between border border-[#564935] bg-[#18151E] px-2.5 py-1.5 font-mono text-[11px] font-bold text-[#E3B94E] md:hidden"
          >
            <span>
              {poolOpenMobile
                ? `編成中のカード（${poolWords.length}枚）を折りたたむ`
                : `編成中のカード（${poolWords.length}枚）を表示する`}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-[#E3B94E] transition-transform ${
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

      {/* Deck Presets Section */}
      <section className="space-y-2.5 border border-[#2E2822] bg-[#121016] p-3 sm:space-y-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPresetsOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-left"
          >
            <Bookmark className="h-4 w-4 shrink-0 text-[#E3B94E]" />
            <h2 className="font-serif text-sm font-bold text-[#F7F3EA] sm:text-base">
              デッキプリセット（{presets.length} / {MAX_DECK_PRESETS}）
            </h2>
            <ChevronDown
              className={`h-4 w-4 text-[#8A7348] transition-transform ${
                presetsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {activePreset && isActivePresetModified && (
            <button
              type="button"
              onClick={() =>
                setSave(saveDeckPresetInSave(save, { id: activePreset.id }))
              }
              className="inline-flex items-center gap-1 border border-[#D4AF37] bg-[#261E0E] px-2.5 py-1 font-mono text-[11px] font-bold text-[#F4D06F] hover:bg-[#3A2E14]"
            >
              <Save className="h-3 w-3" />
              <span>「{activePreset.name}」を上書き保存</span>
            </button>
          )}
        </div>

        {presetsOpen && (
          <div className="space-y-2.5">
            <form
              onSubmit={handleSaveNewPreset}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                type="text"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                maxLength={20}
                placeholder={`プリセット名（空欄なら「プリセット ${presets.length + 1}」）`}
                className="flex-1 border border-[#3A332A] bg-[#0B0A0E] px-3 py-1.5 text-xs text-[#F2ECE0] placeholder:text-[#787166] focus:border-[#D4AF37] focus:outline-none"
              />
              <button
                type="submit"
                disabled={presets.length >= MAX_DECK_PRESETS}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 border border-[#8A7348] bg-[#261E0E] px-4 py-1.5 font-serif text-xs font-bold text-[#E3B94E] hover:bg-[#3A2E14] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Save className="h-3.5 w-3.5" />
                <span>
                  {presets.length >= MAX_DECK_PRESETS
                    ? "保存上限(8件)に到達"
                    : "現在の編成を新規保存"}
                </span>
              </button>
            </form>

            {presets.length === 0 ? (
              <p className="font-mono text-[11px] text-[#8E8678]">
                まだプリセットがありません。現在のマイ辞書＆エースを保存すると、迷宮画面からも1タップで切り替えられます。
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {presets.map((preset) => {
                  const isActive = save.activePresetId === preset.id;
                  const synced = isPresetSyncedWithSave(save, preset);
                  return (
                    <div
                      key={preset.id}
                      className={`flex flex-col justify-between gap-2 border p-2.5 ${
                        isActive
                          ? "border-[#D4AF37] bg-[#1D180E]"
                          : "border-[#2A241E] bg-[#0B0A0E]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-serif text-xs font-bold text-[#F2ECE0]">
                              {preset.name}
                            </span>
                            {isActive && (
                              <span
                                className={`shrink-0 border px-1 py-0.5 font-mono text-[9px] font-bold ${
                                  synced
                                    ? "border-[#2F7D5B] bg-[#11221B] text-[#6EE7B7]"
                                    : "border-[#D4AF37] bg-[#261E0E] text-[#F4D06F]"
                                }`}
                              >
                                {synced ? "使用中" : "編集あり"}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-[#968E7E]">
                            <span className="inline-flex items-center gap-0.5 text-[#E3B94E]">
                              <Crown className="h-2.5 w-2.5" />
                              {preset.aceTerm}
                            </span>
                            <span>{preset.deckPoolTerms.length}枚</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSave(deleteDeckPresetInSave(save, preset.id))
                          }
                          title="プリセットを削除"
                          className="shrink-0 p-1 text-[#787166] hover:text-[#E05A47]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isActive && synced}
                          onClick={() =>
                            setSave(applyDeckPresetInSave(save, preset.id))
                          }
                          className={`flex-1 border py-1 font-mono text-[11px] font-bold transition-colors ${
                            isActive && synced
                              ? "cursor-default border-[#2F7D5B]/50 bg-[#11221B]/50 text-[#6EE7B7]"
                              : "border-[#3A332A] bg-[#141218] text-[#ECE6D8] hover:border-[#8A7348] hover:text-[#E3B94E]"
                          }`}
                        >
                          {isActive && synced ? "適用済み" : "この編成を適用"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSave(saveDeckPresetInSave(save, { id: preset.id }))
                          }
                          title="現在のマイ辞書＆エースで上書き"
                          className="border border-[#3A332A] bg-[#141218] px-2 py-1 font-mono text-[10px] text-[#A89F8E] hover:border-[#8A7348] hover:text-[#E3B94E]"
                        >
                          上書き
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

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
