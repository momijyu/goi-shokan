"use client";

import { ArrowUpDown, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getEffectiveStats,
  SKILL_META,
  type OwnedWord,
  type Rank,
  type SkillType,
} from "@/types/game";

export type WordSortKey =
  | "deck_first"
  | "atk_desc"
  | "def_desc"
  | "cost_asc"
  | "cost_desc"
  | "rank_desc"
  | "plus_desc";

export interface WordFilterState {
  search: string;
  attr: string;
  rank: string;
  skill: string;
  sort: WordSortKey;
  onlyInDeck?: boolean;
}

const RANK_ORDER: Record<Rank, number> = {
  UR: 6,
  SSR: 5,
  SR: 4,
  R: 3,
  N: 2,
  F: 1,
};

export function filterAndSortWords(
  words: OwnedWord[],
  filter: WordFilterState,
  deckPoolSet?: Set<string>,
  aceTerm?: string
): OwnedWord[] {
  const q = filter.search.trim().toLowerCase();

  const filtered = words.filter((w) => {
    if (filter.onlyInDeck && deckPoolSet && !deckPoolSet.has(w.term)) {
      return false;
    }
    if (filter.attr !== "all" && w.attribute !== filter.attr) return false;
    if (filter.rank !== "all" && w.rank !== filter.rank) return false;
    if (filter.skill !== "all" && w.skillType !== filter.skill) return false;
    if (q) {
      const hit =
        w.term.toLowerCase().includes(q) ||
        w.reading.toLowerCase().includes(q) ||
        w.skillDesc.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    const statA = getEffectiveStats(a);
    const statB = getEffectiveStats(b);

    switch (filter.sort) {
      case "deck_first": {
        const aceA = aceTerm === a.term ? 2 : deckPoolSet?.has(a.term) ? 1 : 0;
        const aceB = aceTerm === b.term ? 2 : deckPoolSet?.has(b.term) ? 1 : 0;
        if (aceB !== aceA) return aceB - aceA;
        if (RANK_ORDER[b.rank] !== RANK_ORDER[a.rank]) {
          return RANK_ORDER[b.rank] - RANK_ORDER[a.rank];
        }
        return statB.atk - statA.atk;
      }
      case "atk_desc":
        return statB.atk - statA.atk || statB.def - statA.def;
      case "def_desc":
        return statB.def - statA.def || statB.atk - statA.atk;
      case "cost_asc":
        return a.cost - b.cost || statB.atk - statA.atk;
      case "cost_desc":
        return b.cost - a.cost || statB.atk - statA.atk;
      case "rank_desc":
        return (
          RANK_ORDER[b.rank] - RANK_ORDER[a.rank] || statB.atk - statA.atk
        );
      case "plus_desc":
        return (
          (b.obtainCount ?? 0) - (a.obtainCount ?? 0) ||
          RANK_ORDER[b.rank] - RANK_ORDER[a.rank]
        );
    }
  });
}

interface WordFilterBarProps {
  value: WordFilterState;
  onChange: (next: WordFilterState) => void;
  showDeckOnlyToggle?: boolean;
  showDeckSort?: boolean;
}

export function WordFilterBar({
  value,
  onChange,
  showDeckOnlyToggle = false,
  showDeckSort = false,
}: WordFilterBarProps) {
  const update = (patch: Partial<WordFilterState>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2 border border-[#2A241E] bg-[#0B0A0E] p-2.5">
      {/* Search */}
      <div className="relative min-w-[160px] flex-1 sm:max-w-[220px]">
        <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[#8E8678]" />
        <input
          type="text"
          value={value.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="単語・読み・効果で検索..."
          className="h-8 w-full border border-[#3A332A] bg-[#141218] pr-2.5 pl-8 text-xs text-[#ECE6D8] placeholder:text-[#787166] focus:border-[#D4AF37] focus:outline-none"
        />
      </div>

      {/* Attribute Filter */}
      <Select value={value.attr} onValueChange={(v) => update({ attr: v ?? "all" })}>
        <SelectTrigger className="h-8 w-24 rounded-none border-[#3A332A] bg-[#141218] text-xs text-[#ECE6D8]">
          <SelectValue placeholder="属性" />
        </SelectTrigger>
        <SelectContent className="rounded-none border-[#8A7348] bg-[#141218] text-[#ECE6D8]">
          <SelectItem value="all">全属性</SelectItem>
          <SelectItem value="logic">論理</SelectItem>
          <SelectItem value="emotion">感情</SelectItem>
          <SelectItem value="sense">感覚</SelectItem>
          <SelectItem value="matter">物質</SelectItem>
        </SelectContent>
      </Select>

      {/* Rank Filter */}
      <Select value={value.rank} onValueChange={(v) => update({ rank: v ?? "all" })}>
        <SelectTrigger className="h-8 w-24 rounded-none border-[#3A332A] bg-[#141218] text-xs text-[#ECE6D8]">
          <SelectValue placeholder="ランク" />
        </SelectTrigger>
        <SelectContent className="rounded-none border-[#8A7348] bg-[#141218] text-[#ECE6D8]">
          <SelectItem value="all">全ランク</SelectItem>
          <SelectItem value="UR">異 (UR)</SelectItem>
          <SelectItem value="SSR">極 (SSR)</SelectItem>
          <SelectItem value="SR">秀 (SR)</SelectItem>
          <SelectItem value="R">良 (R)</SelectItem>
          <SelectItem value="N">常 (N)</SelectItem>
          <SelectItem value="F">不 (F)</SelectItem>
        </SelectContent>
      </Select>

      {/* Skill / Ability Filter */}
      <Select value={value.skill} onValueChange={(v) => update({ skill: v ?? "all" })}>
        <SelectTrigger className="h-8 w-36 rounded-none border-[#3A332A] bg-[#141218] text-xs text-[#ECE6D8]">
          <SelectValue placeholder="能力フィルタ" />
        </SelectTrigger>
        <SelectContent className="rounded-none border-[#8A7348] bg-[#141218] text-[#ECE6D8]">
          <SelectItem value="all">全能力（スキル）</SelectItem>
          {(Object.keys(SKILL_META) as SkillType[]).map((key) => (
            <SelectItem key={key} value={key}>
              {SKILL_META[key].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={value.sort}
        onValueChange={(v) => update({ sort: (v ?? "atk_desc") as WordSortKey })}
      >
        <SelectTrigger className="h-8 w-36 rounded-none border-[#8A7348] bg-[#1B1722] text-xs text-[#E3B94E]">
          <ArrowUpDown className="mr-1 h-3 w-3 shrink-0" />
          <SelectValue placeholder="並び替え" />
        </SelectTrigger>
        <SelectContent className="rounded-none border-[#8A7348] bg-[#141218] text-[#ECE6D8]">
          {showDeckSort && (
            <SelectItem value="deck_first">辞書IN優先</SelectItem>
          )}
          <SelectItem value="atk_desc">攻撃力が高い順</SelectItem>
          <SelectItem value="def_desc">防御力が高い順</SelectItem>
          <SelectItem value="rank_desc">ランクが高い順</SelectItem>
          <SelectItem value="cost_asc">コストが低い順</SelectItem>
          <SelectItem value="cost_desc">コストが高い順</SelectItem>
          <SelectItem value="plus_desc">発見回数が多い順</SelectItem>
        </SelectContent>
      </Select>

      {/* Only In Deck toggle */}
      {showDeckOnlyToggle && (
        <button
          type="button"
          onClick={() => update({ onlyInDeck: !value.onlyInDeck })}
          className={`h-8 border px-3 font-mono text-xs font-bold transition-colors ${
            value.onlyInDeck
              ? "border-[#4EB887] bg-[#173629] text-[#6EE7B7]"
              : "border-[#3A332A] bg-[#141218] text-[#A89F8E] hover:border-[#8A7348] hover:text-[#ECE6D8]"
          }`}
        >
          {value.onlyInDeck ? "辞書INのみ: ON" : "辞書INのみ"}
        </button>
      )}
    </div>
  );
}
