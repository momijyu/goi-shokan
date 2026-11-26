"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  Info,
  Loader2,
  Pencil,
  Pickaxe,
  Plus,
  Share2,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { useSaveData } from "@/components/GameShell";
import {
  ExcavationBannerBurst,
  MiningCardRevealFrame,
  SummonCeremonyPanel,
  SummonPortalFlash,
} from "@/components/MiningRevealEffects";
import { WordCard } from "@/components/WordCard";
import { WordDetailDialog } from "@/components/WordDetailDialog";
import {
  analyzeTextForPack,
  MINING_SAMPLE_TEXTS,
  type AnalyzeSummary,
  type MinedCardResult,
} from "@/lib/analyzer";
import {
  buildMiningShareText,
  downloadMiningShareImage,
  openXShareIntent,
} from "@/lib/shareUtils";
import {
  playMiningRevealSound,
  playMiningStartSound,
} from "@/lib/soundFx";
import { applyMiningPackToSave, updateDeckPoolInSave } from "@/lib/storage";
import {
  ATTR_META,
  type Attribute,
} from "@/types/game";

export default function SummonHallPage() {
  const router = useRouter();
  const { save, hydrated, setSave, openTutorial, openAccountModal } = useSaveData();
  const [textDraft, setTextDraft] = useState<string | null>(null);
  const text =
    textDraft ??
    (hydrated && save.totalSummons === 0 ? MINING_SAMPLE_TEXTS[0].text : "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState(false);
  const [result, setResult] = useState<AnalyzeSummary | null>(null);
  const [newTerms, setNewTerms] = useState<string[]>([]);
  const [upgradedTerms, setUpgradedTerms] = useState<string[]>([]);
  const [revealSeq, setRevealSeq] = useState(0);
  const [showCeremony, setShowCeremony] = useState(false);
  const [selectedCard, setSelectedCard] = useState<MinedCardResult | null>(null);
  const [savedShareImg, setSavedShareImg] = useState(false);
  const revealSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (revealSeq === 0) return;
    const timer = window.setTimeout(() => {
      revealSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [revealSeq]);

  const handleMine = async () => {
    if (loading) return;
    if (!text.trim()) {
      setErrorMsg("文章を入力してください。");
      return;
    }
    if (textDraft === null) {
      setTextDraft(text);
    }
    setLoading(true);
    setShowCeremony(true);
    setErrorMsg(null);
    setDuplicateNotice(false);
    playMiningStartSound();
    try {
      const [summary] = await Promise.all([
        analyzeTextForPack(text),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 380);
        }),
      ]);
      if (summary.packCards.length === 0) {
        setErrorMsg(
          "抽出できる語彙が見つかりませんでした。もう少し日本語の名詞・動詞・形容詞を含めてください。"
        );
        setResult(null);
      } else {
        const applied = applyMiningPackToSave(save, summary.packCards, text);
        setSave(applied.next);
        setNewTerms(applied.newTerms);
        setUpgradedTerms(applied.upgradedTerms);
        setDuplicateNotice(applied.isDuplicateText);
        setRevealSeq((n) => n + 1);
        setSavedShareImg(false);
        setResult(summary);
        const topRank = summary.packCards.some((c) => c.entry.rank === "UR")
          ? "UR"
          : summary.packCards.some((c) => c.entry.rank === "SSR")
            ? "SSR"
            : summary.packCards.every((c) => c.entry.rank === "F")
              ? "F"
              : "SR";
        playMiningRevealSound(topRank);
      }
    } catch {
      setErrorMsg("形態素辞書の読み込みに失敗しました。再試行してください。");
    } finally {
      setShowCeremony(false);
      setLoading(false);
    }
  };

  const handleTogglePool = (term: string) => {
    const exists = save.deckPoolTerms.includes(term);
    if (exists) {
      if (save.deckPoolTerms.length <= 6) return;
      const nextPool = save.deckPoolTerms.filter((t) => t !== term);
      const nextAce = save.aceTerm === term ? nextPool[0] : save.aceTerm;
      setSave(updateDeckPoolInSave(save, nextPool, nextAce));
    } else {
      if (save.deckPoolTerms.length >= 30) return;
      const nextPool = [...save.deckPoolTerms, term];
      setSave(updateDeckPoolInSave(save, nextPool, save.aceTerm));
    }
  };

  const poolSlotsLeft = Math.max(0, 30 - save.deckPoolTerms.length);
  const addablePackTerms = result
    ? Array.from(
        new Set(
          result.packCards
            .filter(
              (c) =>
                c.entry.rank !== "F" &&
                !save.deckPoolTerms.includes(c.entry.term)
            )
            .map((c) => c.entry.term)
        )
      ).slice(0, poolSlotsLeft)
    : [];

  const handleBulkAddToPool = () => {
    if (addablePackTerms.length === 0) return;
    const nextPool = [...save.deckPoolTerms, ...addablePackTerms].slice(0, 30);
    setSave(updateDeckPoolInSave(save, nextPool, save.aceTerm));
  };

  const handleAddAllAndGoDungeon = () => {
    if (addablePackTerms.length > 0) {
      handleBulkAddToPool();
    }
    router.push("/dungeon");
  };

  const totalAttrCount = result
    ? Object.values(result.attributeCounts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Title Banner */}
      <section className="kaku-frame p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[11px] tracking-[0.22em] text-[#A89262]">
              PHASE 01 // WORD EXCAVATION
            </p>
            <h1 className="mt-1 font-serif text-2xl font-extrabold tracking-wide text-[#F7F3EA] sm:text-3xl">
              召喚の間 — 文章採掘
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-[#CFC8B8]">
              日記・メモ・企画書などの文章から語彙カードを採掘し、迷宮へ持ち込む「マイ辞書」を鍛え上げよ。
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openAccountModal}
                className="inline-flex items-center gap-1.5 border border-[#5A4722] bg-[#16130E] px-2.5 py-1 font-mono text-[11px] text-[#E3B94E] transition-colors hover:border-[#D4AF37] hover:bg-[#261E0E]"
              >
                <UserCheck className="h-3.5 w-3.5 shrink-0" />
                <span>召喚士：{hydrated ? save.guestName : "読込中"}</span>
                <span className="inline-flex items-center gap-0.5 border-l border-[#3A332A] pl-1.5 text-[10px] text-[#CFC8B8]">
                  <Pencil className="h-2.5 w-2.5" />
                  <span>名前変更</span>
                </span>
              </button>
            </div>
          </div>
          <Link
            href="/dungeon"
            className="inline-flex shrink-0 items-center justify-center gap-2 border border-[#C93A2B] bg-[#291112] px-4 py-2.5 font-serif text-sm font-bold text-[#F7F3EA] transition-colors hover:bg-[#C93A2B]"
          >
            <span>迷宮へ挑む</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* First-Time Progression Guide (Disappears automatically once user completes first run) */}
      {hydrated && save.runHistories.length === 0 && (
        <section className="border border-[#5A4722] bg-[#16130E] p-3.5 sm:p-4">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-bold text-[#E3B94E]">
              はじめての冒険ステップ（迷宮挑戦までの流れ）
            </span>
            <button
              type="button"
              onClick={openTutorial}
              className="font-mono text-[11px] text-[#CFC8B8] underline underline-offset-4 hover:text-[#E3B94E]"
            >
              詳しい遊び方を開く
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div
              className={`border px-3 py-2 text-xs ${
                save.totalSummons >= 1
                  ? "border-[#2F7D5B] bg-[#11221B]/80 text-[#9BD1B5]"
                  : "border-[#8A7348] bg-[#261E0E]/60 text-[#F4D06F]"
              }`}
            >
              <div className="font-mono text-[10px] font-bold">
                {save.totalSummons >= 1 ? "✓ STEP 1 完了" : "STEP 1（いまここ）"}
              </div>
              <div className="mt-0.5 font-serif font-bold">
                下のサンプル文・文章から語彙を採掘する
              </div>
            </div>

            <Link
              href="/deck"
              className="border border-[#2E2822] bg-[#0B0A0E] px-3 py-2 text-xs text-[#CFC8B8] transition-colors hover:border-[#8A7348]"
            >
              <div className="font-mono text-[10px] font-bold text-[#8A7348]">
                STEP 2（任意・初期20枚あり）
              </div>
              <div className="mt-0.5 font-serif font-bold text-[#ECE6D8]">
                マイ辞書・エースを確認・編成する →
              </div>
            </Link>

            <Link
              href="/dungeon"
              className={`border px-3 py-2 text-xs transition-colors ${
                save.totalSummons >= 1
                  ? "border-[#C93A2B] bg-[#261314] text-[#F7F3EA] hover:bg-[#3A1B1D]"
                  : "border-[#2E2822] bg-[#0B0A0E] text-[#CFC8B8] hover:border-[#C93A2B]"
              }`}
            >
              <div className="font-mono text-[10px] font-bold text-[#E05A47]">
                STEP 3
              </div>
              <div className="mt-0.5 font-serif font-bold">
                迷宮（第一層）へ出撃する →
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Text Input Area */}
      <section className="border border-[#2E2822] bg-[#121016] p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#A89262]">
              サンプル文で試す
            </span>
            {hydrated && save.totalSummons === 0 && (
              <span className="border border-[#5A4722] bg-[#1E170A] px-2 py-0.5 font-mono text-[10px] font-bold text-[#E3B94E]">
                初回用サンプル入力済（そのまま採掘OK）
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MINING_SAMPLE_TEXTS.map((s) => {
              const isSelected = text === s.text;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setTextDraft(isSelected ? "" : s.text)}
                  className={`border px-3 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? "border-[#D4AF37] bg-[#261E0E] font-bold text-[#E3B94E]"
                      : "border-[#3A332A] bg-[#18151E] text-[#DCD4C2] hover:border-[#8A7348] hover:text-[#E3B94E]"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setTextDraft(e.target.value)}
          maxLength={2500}
          rows={5}
          placeholder="ここにあなたの文章を貼り付け、または入力してください（最大2,500文字）..."
          className="w-full resize-y border border-[#322C26] bg-[#0B0A0E] p-3 text-sm leading-relaxed text-[#F2ECE0] placeholder:text-[#787166] focus:border-[#D4AF37] focus:outline-none"
        />

        <div className="mt-3 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs text-[#A89F8E]">
            <span>文字数: {text.length} / 2,500</span>
            <span>|</span>
            <span>所持語彙: {Object.keys(save.ownedWords).length}種</span>
            {text.length > 0 && (
              <button
                type="button"
                onClick={() => setTextDraft("")}
                className="inline-flex items-center gap-1 border border-[#3A332A] bg-[#18151E] px-2 py-0.5 text-[11px] text-[#CFC8B8] hover:border-[#C93A2B] hover:text-[#E05A47]"
              >
                <X className="h-3 w-3" />
                <span>消去</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleMine}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 border border-[#D4AF37] bg-[#261E0E] px-6 py-2.5 font-serif text-sm font-extrabold tracking-wider text-[#F7F3EA] transition-all hover:bg-[#3A2E14] disabled:opacity-75 ${
              loading ? "animate-pulse shadow-[0_0_16px_rgba(212,175,55,0.35)]" : ""
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#E3B94E]" />
                <span>形態素解析・辞書読込中...</span>
              </>
            ) : (
              <>
                <Pickaxe className="h-4 w-4 text-[#E3B94E]" />
                <span>文章から語彙を採掘（最大6枚）</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <p className="mt-3 border border-[#5C3530] bg-[#261A19] px-3 py-2 text-xs text-[#E05A47]">
            {errorMsg}
          </p>
        )}
      </section>

      {/* Pack Reveal Results */}
      <AnimatePresence mode="wait">
        {showCeremony ? (
          <SummonCeremonyPanel key="summon_ceremony" />
        ) : (
          result && (
          <motion.section
            ref={revealSectionRef}
            key={`reveal_${revealSeq}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="kaku-frame relative scroll-mt-16 overflow-hidden p-4 sm:p-5"
          >
            <SummonPortalFlash
              revealSeq={revealSeq}
              hasUR={result.packCards.some((c) => c.entry.rank === "UR")}
              hasSSR={result.packCards.some((c) => c.entry.rank === "SSR")}
            />
            <ExcavationBannerBurst
              revealSeq={revealSeq}
              newCount={duplicateNotice ? 0 : newTerms.length}
              upgradedCount={duplicateNotice ? 0 : upgradedTerms.length}
              hasUR={result.packCards.some((c) => c.entry.rank === "UR")}
              hasSSR={result.packCards.some((c) => c.entry.rank === "SSR")}
              isDuplicate={duplicateNotice}
            />

            <div className="mb-4 flex flex-col justify-between gap-2 border-b border-[#2E2822] pb-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#E3B94E]" />
                <h2 className="font-serif text-lg font-extrabold text-[#F7F3EA]">
                  採掘結果パック
                </h2>
                <span className="font-mono text-xs text-[#A89F8E]">
                  （抽出総数 {result.totalExtractedWords}語中 ピックアップ {result.packCards.length}枚）
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {addablePackTerms.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkAddToPool}
                    className="inline-flex items-center gap-1 border border-[#2F7D5B] bg-[#11221B] px-2.5 py-1 font-mono text-xs font-bold text-[#6EE7B7] transition-colors hover:bg-[#193529]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>未登録をまとめて辞書へ (+{addablePackTerms.length}枚)</span>
                  </button>
                )}
                <Link
                  href="/deck"
                  className="font-mono text-xs font-bold text-[#E3B94E] underline-offset-4 hover:underline"
                >
                  マイ辞書を確認 ({save.deckPoolTerms.length}/30) →
                </Link>
              </div>
            </div>

            {duplicateNotice && (
              <div className="mb-4 flex items-start gap-2 border border-[#5A4722] bg-[#1E170A] px-3 py-2.5 text-xs text-[#E3B94E]">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  直近で採掘済みの文章のため、今回はカード解析のみ表示しています（別の文章を入力すると新規獲得や再発見の記録が行われます）。
                </span>
              </div>
            )}

            {result.repeatedTerms.length > 0 && (
              <div className="mb-4 flex items-start gap-2 border border-[#5C3530] bg-[#241414] px-3 py-2.5 text-xs text-[#F07167]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  過度な連呼を検出（{result.repeatedTerms.join("・")}）：劣化カード『不』として排出されました。
                </span>
              </div>
            )}

            {/* Cards Grid (wider cards so skill text and stats are super legible!) */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-6">
              {result.packCards.map((item, idx) => {
                const isNew = newTerms.includes(item.entry.term);
                const isUpgraded = upgradedTerms.includes(item.entry.term);
                const inPool = save.deckPoolTerms.includes(item.entry.term);

                const statusBadge = duplicateNotice
                  ? "解析済"
                  : isNew
                    ? "NEW!"
                    : isUpgraded
                      ? "再発見"
                      : undefined;

                return (
                  <MiningCardRevealFrame
                    key={`${revealSeq}_${item.entry.term}_${idx}`}
                    revealSeq={revealSeq}
                    index={idx}
                    rank={item.entry.rank}
                    isNew={isNew && !duplicateNotice}
                    isUpgraded={isUpgraded && !duplicateNotice}
                  >
                    <WordCard
                      word={item.entry}
                      plusLevel={0}
                      badgeText={statusBadge}
                      inDeck={inPool}
                      isAce={save.aceTerm === item.entry.term}
                      onClick={() => setSelectedCard(item)}
                    />
                    <button
                      type="button"
                      onClick={() => handleTogglePool(item.entry.term)}
                      className={`flex items-center justify-center gap-1 border py-1.5 font-mono text-xs font-bold transition-colors ${
                        inPool
                          ? "border-[#2F7D5B] bg-[#11221B] text-[#6EE7B7]"
                          : "border-[#3A332A] bg-[#141218] text-[#DCD4C2] hover:border-[#8A7348] hover:text-[#E3B94E]"
                      }`}
                    >
                      {inPool ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>辞書登録済</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>辞書に追加</span>
                        </>
                      )}
                    </button>
                  </MiningCardRevealFrame>
                );
              })}
            </div>

            {/* Share Results Bar */}
            <div className="mt-4 flex flex-col justify-between gap-3 border border-[#4A3E2A] bg-[#141118] px-3.5 py-3 sm:flex-row sm:items-center">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-serif text-sm font-bold text-[#F7F3EA]">
                  <Share2 className="h-4 w-4 text-[#E3B94E]" />
                  <span>おもしろい語彙が出たらXでシェア！</span>
                </div>
                <p className="text-[11px] text-[#A89F8E]">
                  {savedShareImg
                    ? "画像を保存しました！Xの投稿画面でそのまま添付できます。"
                    : "結果画像（PNG）を保存してポストに添付するとタイムラインで目立ちます。"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    openXShareIntent(
                      buildMiningShareText(
                        result.packCards,
                        result.totalExtractedWords
                      )
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 border border-[#F7F3EA] bg-[#F7F3EA] px-4 py-2 font-mono text-xs font-extrabold text-[#0B0A0E] shadow-sm transition-colors hover:bg-white"
                >
                  <span>𝕏 ポストする</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadMiningShareImage(
                      result.packCards,
                      result.totalExtractedWords
                    );
                    setSavedShareImg(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 border border-[#8A7348] bg-[#221B11] px-3.5 py-2 font-mono text-xs font-bold text-[#F4D06F] transition-colors hover:border-[#D4AF37] hover:bg-[#312617]"
                >
                  {savedShareImg ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#6EE7B7]" />
                      <span className="text-[#6EE7B7]">画像保存済み</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      <span>結果画像を保存 (PNG)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Attribute Balance Bar */}
            {totalAttrCount > 0 && (
              <div className="mt-5 border-t border-[#2E2822] pt-4">
                <div className="mb-2 flex items-center justify-between font-mono text-xs text-[#A89F8E]">
                  <span>文章の属性バランス</span>
                  <span>カードをクリックすると詳細が見られます</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {(["logic", "emotion", "sense", "matter"] as Attribute[]).map((attr) => {
                    const meta = ATTR_META[attr];
                    const count = result.attributeCounts[attr];
                    const pct = Math.round((count / totalAttrCount) * 100);
                    return (
                      <div
                        key={attr}
                        className="border border-[#2A241E] bg-[#0B0A0E] px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span style={{ color: meta.color }} className="font-serif font-bold">
                            {meta.label}
                          </span>
                          <span className="font-mono font-bold text-[#F2ECE0]">
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full bg-[#1C1922]">
                          <div
                            style={{ width: `${pct}%`, backgroundColor: meta.color }}
                            className="h-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Next Step CTA */}
            <div className="mt-5 grid gap-2 border-t border-[#2E2822] pt-4 sm:grid-cols-2">
              <Link
                href="/deck"
                className="flex items-center justify-center gap-2 border border-[#8A7348] bg-[#261E0E] py-2.5 font-serif text-xs font-bold text-[#E3B94E] transition-colors hover:bg-[#352A14]"
              >
                <span>マイ辞書・エースを編成 ({save.deckPoolTerms.length}/30)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {addablePackTerms.length > 0 ? (
                <button
                  type="button"
                  onClick={handleAddAllAndGoDungeon}
                  className="flex items-center justify-center gap-2 border border-[#C93A2B] bg-[#291112] py-2.5 font-serif text-xs font-extrabold text-[#F7F3EA] transition-colors hover:bg-[#C93A2B]"
                >
                  <span>今回の{addablePackTerms.length}枚を辞書に入れて迷宮へ挑む</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Link
                  href="/dungeon"
                  className="flex items-center justify-center gap-2 border border-[#C93A2B] bg-[#291112] py-2.5 font-serif text-xs font-extrabold text-[#F7F3EA] transition-colors hover:bg-[#C93A2B]"
                >
                  <span>この辞書で迷宮へ挑む</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </motion.section>
          )
        )}
      </AnimatePresence>

      <WordDetailDialog
        word={
          selectedCard
            ? {
                ...selectedCard.entry,
                obtainCount: save.ownedWords[selectedCard.entry.term]?.obtainCount ?? 1,
                firstSnippet: selectedCard.snippet,
              }
            : null
        }
        open={Boolean(selectedCard)}
        onOpenChange={(open) => !open && setSelectedCard(null)}
        actionButton={
          selectedCard ? (
            <button
              type="button"
              onClick={() => handleTogglePool(selectedCard.entry.term)}
              className="w-full border border-[#8A7348] bg-[#261E0E] py-2 font-serif text-xs font-bold text-[#E3B94E] hover:bg-[#352A14]"
            >
              {save.deckPoolTerms.includes(selectedCard.entry.term)
                ? "マイ辞書から外す"
                : `マイ辞書に追加する (${save.deckPoolTerms.length}/30)`}
            </button>
          ) : null
        }
      />
    </div>
  );
}
