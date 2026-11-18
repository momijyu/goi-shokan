"use client";

import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, Shield, Sparkles, Sword } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  lookupWordDefinitions,
  type WordDefinitionLookupResult,
} from "@/lib/wordDefinitions";
import {
  ATTR_META,
  getEffectiveStats,
  RANK_META,
  SKILL_META,
  type OwnedWord,
  type WordMasterEntry,
} from "@/types/game";

interface WordDetailDialogProps {
  word: (WordMasterEntry & Partial<Pick<OwnedWord, "obtainCount" | "firstSnippet">>) | null;
  plusLevel?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionButton?: React.ReactNode;
}

export function WordDetailDialog({
  word,
  plusLevel = 0,
  open,
  onOpenChange,
  actionButton,
}: WordDetailDialogProps) {
  const [defLookup, setDefLookup] = useState<{
    term: string;
    result: WordDefinitionLookupResult;
  } | null>(null);
  const targetTerm = open && word ? word.term : null;

  useEffect(() => {
    if (!targetTerm) return;
    let cancelled = false;
    lookupWordDefinitions(targetTerm).then((result) => {
      if (!cancelled) {
        setDefLookup({ term: targetTerm, result });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [targetTerm]);

  if (!word) return null;

  const rankMeta = RANK_META[word.rank];
  const attrMeta = ATTR_META[word.attribute];
  const skillMeta = SKILL_META[word.skillType];
  const stats = getEffectiveStats(word, plusLevel);
  const isLoadingDefs = defLookup?.term !== word.term;
  const defs = defLookup?.term === word.term ? defLookup.result.defs : [];
  const defSource = defLookup?.term === word.term ? defLookup.result.source : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border border-[#8A7348] bg-[#121016] text-[#ECE6D8] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              style={{
                color: rankMeta.color,
                backgroundColor: rankMeta.bg,
                borderColor: rankMeta.border,
              }}
              className="inline-flex h-7 w-7 items-center justify-center border font-serif text-sm font-extrabold"
            >
              {rankMeta.kanji}
            </span>
            <DialogTitle className="font-serif text-2xl font-extrabold tracking-wide text-[#F2ECE0]">
              {word.term}
            </DialogTitle>
            {stats.plusLevel > 0 && (
              <span className="border border-[#8A7348] bg-[#261E0E] px-1.5 py-0.5 font-mono text-xs font-bold text-[#E3B94E]">
                +{stats.plusLevel}
              </span>
            )}
          </div>
          <p className="font-sans text-xs text-[#A89F8E]">
            読み：{word.reading} ／ ランク：{rankMeta.label}（{rankMeta.kanji}） ／ 属性：
            <span style={{ color: attrMeta.color }} className="font-bold">
              {attrMeta.label}（{attrMeta.roleHint}）
            </span>
            {typeof word.obtainCount === "number" && (
              <span> ／ 発見回数：{word.obtainCount}回</span>
            )}
          </p>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <div className="border border-[#2A241E] bg-[#0B0A0E] px-3 py-2 text-[11px] text-[#CFC8B8]">
            <span style={{ color: attrMeta.color }} className="font-bold">
              [{attrMeta.label}特性]
            </span>{" "}
            {attrMeta.battleEffect}
          </div>
          <div className="grid grid-cols-3 gap-2 border border-[#2E2822] bg-[#0B0A0E] p-3 font-mono">
            <div>
              <span className="block text-[11px] text-[#8E8678]">コスト</span>
              <span className="text-lg font-bold text-[#ECE6D8]">{word.cost}</span>
            </div>
            <div>
              <span className="block text-[11px] text-[#8E8678]">基礎攻撃</span>
              <span className="inline-flex items-center gap-1 text-lg font-bold text-[#F07167]">
                <Sword className="h-4 w-4" />
                {stats.atk}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-[#8E8678]">基礎防御</span>
              <span className="inline-flex items-center gap-1 text-lg font-bold text-[#69A3D9]">
                <Shield className="h-4 w-4" />
                {stats.def}
              </span>
            </div>
          </div>

          <div className="border border-[#2E2822] bg-[#16131C] p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#E3B94E]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>スキル発動時の効果</span>
              </span>
              <span
                style={{ color: skillMeta.color }}
                className="border border-[#3A332A] bg-[#0B0A0E] px-2 py-0.5 font-mono text-[10px] font-bold"
              >
                {skillMeta.shortTag}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#ECE6D8]">{word.skillDesc}</p>
          </div>

          <div className="border border-[#2E2822] bg-[#0B0A0E] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#A89262]">
                <BookOpen className="h-3.5 w-3.5" />
                <span>言葉の意味</span>
              </span>
              <a
                href={`https://ja.wiktionary.org/wiki/${encodeURIComponent(word.term)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 border border-[#3A332A] bg-[#141218] px-2 py-0.5 font-mono text-[10px] text-[#CFC8B8] hover:border-[#8A7348] hover:text-[#E3B94E]"
              >
                <span>Wiktionaryで調べる</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            {isLoadingDefs ? (
              <p className="text-[11px] text-[#8E8678]">語釈を読み込み中…</p>
            ) : defs.length > 0 ? (
              <div className="space-y-1">
                <ul className="space-y-1 text-xs leading-relaxed text-[#DCD4C2]">
                  {defs.map((d, i) => (
                    <li key={i}>
                      <span className="mr-1.5 font-mono text-[10px] text-[#8A7348]">
                        {i + 1}.
                      </span>
                      {d}
                    </li>
                  ))}
                </ul>
                {(defSource === "wordnet" || defSource === "derived") && (
                  <p className="flex flex-wrap items-center justify-between gap-2 pt-0.5 font-mono text-[10px] text-[#6B6458]">
                    <span>
                      {defSource === "wordnet"
                        ? "出典：日本語WordNet (NICT)"
                        : "出典：日本語WordNet (NICT) 語幹参照"}
                    </span>
                    <a
                      href="/THIRD_PARTY_NOTICES.txt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-[#E3B94E]"
                    >
                      権利表記・免責
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-[#8E8678]">
                収録語釈が見つかりませんでした。上のリンクからWeb辞典で確認できます。
              </p>
            )}
          </div>

          {word.firstSnippet && (
            <div className="border-l-2 border-[#8A7348] bg-[#0B0A0E] px-3 py-2 text-xs text-[#A89F8E]">
              <span className="block font-mono text-[10px] text-[#8A7348]">
                初発見の文脈
              </span>
              <span className="mt-0.5 block italic text-[#DCD4C2]">
                「{word.firstSnippet}」
              </span>
            </div>
          )}

          {actionButton && <div className="pt-1">{actionButton}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
