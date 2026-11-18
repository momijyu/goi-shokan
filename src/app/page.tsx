"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Info,
  Loader2,
  Pickaxe,
  Plus,
  Sparkles,
} from "lucide-react";
import { useSaveData } from "@/components/GameShell";
import { WordCard } from "@/components/WordCard";
import { WordDetailDialog } from "@/components/WordDetailDialog";
import { analyzeTextForPack, type AnalyzeSummary, type MinedCardResult } from "@/lib/analyzer";
import { applyMiningPackToSave, updateDeckPoolInSave } from "@/lib/storage";
import {
  ATTR_META,
  type Attribute,
} from "@/types/game";

const SAMPLE_TEXTS: { label: string; text: string }[] = [
  {
    label: "論理の企画書風",
    text: "現状の施策は理想と大きく乖離している。したがって、前提となる構造を再定義する必要がある。仮説の妥当性を精査したうえで抜本的な体系へ刷新すれば、必然的に成果へ帰結する蓋然性が高い。",
  },
  {
    label: "激動の創作・感情文",
    text: "漆黒の蒼穹に閃光が轟く刹那、抑えきれぬ激情と渇望が胸を焦がす。どれほどの葛藤と絶望に震える夜を越えても、心の奥底に宿る矜持だけは決して儚く消えはしない。",
  },
  {
    label: "口癖まみれの雑文（不狙い）",
    text: "えっと、なんか今日の会議マジでやばい雰囲気だったと思う。とりあえずやばいやばいやばいやばいって感じで、なんかもうてきとうに進めるしかないかなーって感じ。",
  },
];

export default function SummonHallPage() {
  const { save, setSave } = useSaveData();
  const [text, setText] = useState(SAMPLE_TEXTS[0].text);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState(false);
  const [result, setResult] = useState<AnalyzeSummary | null>(null);
  const [newTerms, setNewTerms] = useState<string[]>([]);
  const [upgradedTerms, setUpgradedTerms] = useState<string[]>([]);
  const [selectedCard, setSelectedCard] = useState<MinedCardResult | null>(null);

  const handleMine = async () => {
    if (loading) return;
    if (!text.trim()) {
      setErrorMsg("文章を入力してください。");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setDuplicateNotice(false);
    try {
      const summary = await analyzeTextForPack(text);
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
        setResult(summary);
      }
    } catch {
      setErrorMsg("形態素辞書の読み込みに失敗しました。再試行してください。");
    } finally {
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

      {/* Text Input Area */}
      <section className="border border-[#2E2822] bg-[#121016] p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-[#A89262]">
            サンプル文で試す
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_TEXTS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setText(s.text)}
                className="border border-[#3A332A] bg-[#18151E] px-3 py-1.5 text-xs text-[#DCD4C2] transition-colors hover:border-[#8A7348] hover:text-[#E3B94E]"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2500}
          rows={5}
          placeholder="ここにあなたの文章を貼り付け、または入力してください（最大2,500文字）..."
          className="w-full resize-y border border-[#322C26] bg-[#0B0A0E] p-3 text-sm leading-relaxed text-[#F2ECE0] placeholder:text-[#787166] focus:border-[#D4AF37] focus:outline-none"
        />

        <div className="mt-3 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 font-mono text-xs text-[#A89F8E]">
            <span>文字数: {text.length} / 2,500</span>
            <span>|</span>
            <span>所持語彙: {Object.keys(save.ownedWords).length}種</span>
          </div>

          <button
            type="button"
            onClick={handleMine}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 border border-[#D4AF37] bg-[#261E0E] px-6 py-2.5 font-serif text-sm font-extrabold tracking-wider text-[#F7F3EA] transition-colors hover:bg-[#3A2E14] disabled:opacity-50"
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
        {result && (
          <motion.section
            key={`${save.totalSummons}_${duplicateNotice ? "dup" : "ok"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="kaku-frame p-4 sm:p-5"
          >
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
              <Link
                href="/deck"
                className="font-mono text-xs font-bold text-[#E3B94E] underline-offset-4 hover:underline"
              >
                マイ辞書を整理する ({save.deckPoolTerms.length}/30) →
              </Link>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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
                  <motion.div
                    key={`${item.entry.term}_${idx}`}
                    initial={{ opacity: 0, scale: 0.94, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.18 }}
                    className="flex flex-col gap-1.5"
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
                  </motion.div>
                );
              })}
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
          </motion.section>
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
