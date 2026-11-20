"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { AttributeGuideBar } from "@/components/AttributeGuideBar";
import { useSaveData } from "@/components/GameShell";
import { WordCard } from "@/components/WordCard";
import { WordDetailDialog } from "@/components/WordDetailDialog";
import {
  filterAndSortWords,
  WordFilterBar,
  type WordFilterState,
} from "@/components/WordFilterBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ACHIEVEMENTS } from "@/data/achievements";
import { RELIC_LIST } from "@/data/relics";
import { getWordMaster, THEME_PACKS } from "@/data/words";
import { type OwnedWord, type WordMasterEntry } from "@/types/game";

export default function CodexPage() {
  const { save } = useSaveData();
  const [selectedWord, setSelectedWord] = useState<
    (WordMasterEntry & Partial<Pick<OwnedWord, "obtainCount" | "firstSnippet">>) | null
  >(null);
  const [albumFilter, setAlbumFilter] = useState<WordFilterState>({
    search: "",
    attr: "all",
    rank: "all",
    skill: "all",
    sort: "rank_desc",
  });

  const ownedList = Object.values(save.ownedWords);
  const urList = ownedList.filter((w) => w.rank === "UR");
  const deckPoolSet = new Set(save.deckPoolTerms);
  const filteredAlbum = filterAndSortWords(
    ownedList,
    albumFilter,
    deckPoolSet,
    save.aceTerm
  );

  return (
    <div className="space-y-6">
      <section className="kaku-frame p-4 sm:p-5">
        <p className="font-mono text-[11px] tracking-[0.22em] text-[#A89262]">
          ARCHIVE & TROPHIES
        </p>
        <h1 className="mt-1 font-serif text-2xl font-extrabold text-[#F7F3EA]">
          語彙図鑑 ＆ 実績
        </h1>
        <p className="mt-1 text-xs text-[#CFC8B8]">
          テーマ別厳選パックのコンプリートと、未知語『異』・遺物・実績の収集記録。
        </p>
      </section>

      <Tabs defaultValue="themes" className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-none border border-[#2E2822] bg-[#121016] p-1">
          <TabsTrigger
            value="themes"
            className="rounded-none px-3 py-1.5 font-serif text-xs data-[state=active]:bg-[#261E0E] data-[state=active]:text-[#E3B94E]"
          >
            テーマ別語彙図鑑
          </TabsTrigger>
          <TabsTrigger
            value="album"
            className="rounded-none px-3 py-1.5 font-serif text-xs data-[state=active]:bg-[#261E0E] data-[state=active]:text-[#E3B94E]"
          >
            マイ語彙 ({ownedList.length})
          </TabsTrigger>
          <TabsTrigger
            value="ur"
            className="rounded-none px-3 py-1.5 font-serif text-xs data-[state=active]:bg-[#291112] data-[state=active]:text-[#E05A47]"
          >
            異ラボ ({urList.length})
          </TabsTrigger>
          <TabsTrigger
            value="relics"
            className="rounded-none px-3 py-1.5 font-serif text-xs data-[state=active]:bg-[#261E0E] data-[state=active]:text-[#E3B94E]"
          >
            遺物図鑑 ({save.discoveredRelics.length}/{RELIC_LIST.length})
          </TabsTrigger>
          <TabsTrigger
            value="achievements"
            className="rounded-none px-3 py-1.5 font-serif text-xs data-[state=active]:bg-[#261E0E] data-[state=active]:text-[#E3B94E]"
          >
            実績 ({save.unlockedAchievements.length}/{ACHIEVEMENTS.length})
          </TabsTrigger>
        </TabsList>

        {/* Theme Packs */}
        <TabsContent value="themes" className="space-y-4">
          {THEME_PACKS.map((pack) => {
            const collectedCount = pack.terms.filter((t) =>
              Boolean(save.ownedWords[t])
            ).length;
            const pct = Math.round((collectedCount / pack.terms.length) * 100);
            return (
              <div
                key={pack.id}
                className="border border-[#2E2822] bg-[#121016] p-4 space-y-3"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-serif text-lg font-extrabold text-[#F7F3EA]">
                      {pack.name}
                    </h2>
                    <p className="text-xs text-[#A89F8E]">{pack.description}</p>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#E3B94E]">
                    達成 {collectedCount} / {pack.terms.length}（{pct}%）
                  </div>
                </div>
                <div className="h-1.5 w-full bg-[#0B0A0E]">
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full bg-[#D4AF37]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-8">
                  {pack.terms.map((term) => {
                    const owned = save.ownedWords[term];
                    const master = getWordMaster(term);
                    if (owned) {
                      return (
                        <WordCard
                          key={term}
                          word={owned}
                          compact
                          onClick={() => setSelectedWord(owned)}
                        />
                      );
                    }
                    return (
                      <div
                        key={term}
                        className="flex min-h-[124px] flex-col items-center justify-center border border-[#242028] bg-[#0B0A0E] p-2 text-center"
                      >
                        <Lock className="mb-1 h-3.5 w-3.5 text-[#4A453C]" />
                        <span className="font-serif text-xs text-[#6B6459]">
                          {master?.term ?? "？？？"}
                        </span>
                        <span className="mt-1 font-mono text-[10px] text-[#4A453C]">
                          未発見
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* My Album with Sort & Skill Filter */}
        <TabsContent value="album" className="space-y-4">
          <AttributeGuideBar />
          <WordFilterBar value={albumFilter} onChange={setAlbumFilter} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
            {filteredAlbum.map((w) => (
              <WordCard
                key={w.term}
                word={w}
                inDeck={deckPoolSet.has(w.term)}
                isAce={save.aceTerm === w.term}
                className="min-h-[168px] p-2 sm:min-h-[200px] sm:p-3"
                onClick={() => setSelectedWord(w)}
              />
            ))}
          </div>
        </TabsContent>

        {/* UR Lab */}
        <TabsContent value="ur">
          {urList.length === 0 ? (
            <div className="border border-[#2E2822] bg-[#121016] p-8 text-center text-xs text-[#968E7E]">
              まだ未知語『異』は観測されていません。新語や独自の造語を含んだ文章を採掘してみてください。
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
              {urList.map((w) => (
                <WordCard
                  key={w.term}
                  word={w}
                  badgeText="未知語"
                  className="min-h-[168px] p-2 sm:min-h-[200px] sm:p-3"
                  onClick={() => setSelectedWord(w)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Relics */}
        <TabsContent value="relics">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {RELIC_LIST.map((r) => {
              const unlocked = save.discoveredRelics.includes(r.id);
              return (
                <div
                  key={r.id}
                  className={`border p-3.5 ${
                    unlocked
                      ? "border-[#8A7348] bg-[#16131C]"
                      : "border-[#242028] bg-[#0E0C12] opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm font-bold text-[#E3B94E]">
                      {unlocked ? r.name : "？？？"}
                    </span>
                    <span className="border border-[#3A332A] px-1.5 py-0.5 font-mono text-[10px] text-[#A89F8E]">
                      {r.rankLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#DCD4C2]">
                    {unlocked ? r.description : "迷宮内で獲得すると解放されます。"}
                  </p>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Achievements */}
        <TabsContent value="achievements">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = save.unlockedAchievements.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`flex items-start gap-3 border p-3.5 ${
                    unlocked
                      ? "border-[#D4AF37] bg-[#1A1610]"
                      : "border-[#242028] bg-[#100E14] opacity-55"
                  }`}
                >
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center border font-serif text-lg font-extrabold ${
                      unlocked
                        ? "border-[#D4AF37] bg-[#261E0E] text-[#E3B94E]"
                        : "border-[#3A332A] bg-[#0B0A0E] text-[#565047]"
                    }`}
                  >
                    {a.badgeKanji}
                  </span>
                  <div>
                    <h3 className="font-serif text-sm font-bold text-[#F2ECE0]">
                      {a.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#A89F8E]">{a.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <WordDetailDialog
        word={selectedWord}
        open={Boolean(selectedWord)}
        onOpenChange={(open) => !open && setSelectedWord(null)}
      />
    </div>
  );
}
