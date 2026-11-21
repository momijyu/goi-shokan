"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Send, Trophy } from "lucide-react";
import { useSaveData } from "@/components/GameShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ACHIEVEMENTS } from "@/data/achievements";
import { SPECIAL_STAGES, STAGES } from "@/data/enemies";
import { getRelicDef } from "@/data/relics";
import { formatJapaneseNumber, getTodayJstDateKey } from "@/lib/bignum";
import {
  fetchRankings,
  isRankingConfigured,
  submitRankingScore,
  type RankingEntry,
} from "@/lib/rankings";

export default function RecordsPage() {
  const { save, hydrated } = useSaveData();
  const bestFmt = formatJapaneseNumber(save.bestDamage);
  const rankingEnabled = isRankingConfigured();
  const todayDateKey = hydrated ? getTodayJstDateKey() : "";

  const [rankMode, setRankMode] = useState<"overall" | "daily">("overall");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [refreshTick, setRefreshTick] = useState(0);
  const queryKey = `${rankMode}_${stageFilter}_${refreshTick}`;
  const [rankingResult, setRankingResult] = useState<{
    key: string;
    entries: RankingEntry[];
    error: string | null;
  } | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const loading = rankingEnabled && rankingResult?.key !== queryKey;
  const entries = rankingResult?.entries ?? [];
  const rankError = rankingResult?.key === queryKey ? rankingResult.error : null;

  useEffect(() => {
    if (!rankingEnabled) return;
    let cancelled = false;
    fetchRankings({
      mode: rankMode,
      dailyDate: getTodayJstDateKey(),
      stageId: stageFilter,
      limit: 50,
    }).then((res) => {
      if (!cancelled) {
        setRankingResult({
          key: queryKey,
          entries: res.entries,
          error: res.error ? `ランキング取得に失敗しました（${res.error}）` : null,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [rankingEnabled, rankMode, stageFilter, queryKey]);

  const loadRankings = () => {
    setRefreshTick((n) => n + 1);
  };

  const handleSubmitHistoryEntry = async (
    history: (typeof save.runHistories)[number]
  ) => {
    setSubmittingId(history.id);
    setSubmitMessage(null);
    const res = await submitRankingScore({
      runId: history.id,
      playerName: save.guestName,
      stageId: history.stageId,
      stageName: history.stageName,
      isDaily: history.isDaily,
      dailyDate: history.isDaily
        ? getTodayJstDateKey(new Date(history.createdAt))
        : null,
      cleared: history.cleared,
      reachedFloor: history.reachedFloor,
      maxDamage: history.maxDamage,
      relicIds: history.relicIds,
    });
    setSubmittingId(null);
    if (res.ok) {
      setSubmitMessage("オンラインランキングへ記録を送信しました。");
      loadRankings();
    } else {
      setSubmitMessage(`送信に失敗しました（${res.error ?? "不明なエラー"}）`);
    }
  };

  const bestLocalHistory = save.runHistories.reduce<
    (typeof save.runHistories)[number] | null
  >((best, cur) => {
    if (cur.maxDamage <= 0) return best;
    if (!best) return cur;
    return cur.maxDamage > best.maxDamage ? cur : best;
  }, null);

  return (
    <div className="space-y-6">
      <section className="kaku-frame p-4 sm:p-5">
        <p className="font-mono text-[10px] tracking-[0.25em] text-[#8A7348]">
          RECORDS & RANKINGS
        </p>
        <h1 className="mt-1 font-serif text-2xl font-extrabold text-[#F2ECE0]">
          戦績・ランキング
        </h1>
        <p className="mt-1 text-xs text-[#A89F8E]">
          最大一撃出力・オンライン全国順位・過去の迷宮挑戦履歴を確認できます。
        </p>
      </section>

      {/* Stat Grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border border-[#2E2822] bg-[#121016] p-4">
          <span className="font-mono text-[10px] text-[#8A7348]">自己最高一撃</span>
          <div className={`mt-1 font-pixel text-2xl font-bold ${bestFmt.colorClass}`}>
            {bestFmt.text}
          </div>
        </div>
        <div className="border border-[#2E2822] bg-[#121016] p-4">
          <span className="font-mono text-[10px] text-[#8A7348]">所持語彙数</span>
          <div className="mt-1 font-mono text-2xl font-bold text-[#ECE6D8]">
            {Object.keys(save.ownedWords).length}
          </div>
        </div>
        <div className="border border-[#2E2822] bg-[#121016] p-4">
          <span className="font-mono text-[10px] text-[#8A7348]">採掘回数</span>
          <div className="mt-1 font-mono text-2xl font-bold text-[#ECE6D8]">
            {save.totalSummons}
          </div>
        </div>
        <div className="border border-[#2E2822] bg-[#121016] p-4">
          <span className="font-mono text-[10px] text-[#8A7348]">実績達成</span>
          <div className="mt-1 font-mono text-2xl font-bold text-[#E3B94E]">
            {save.unlockedAchievements.length} / {ACHIEVEMENTS.length}
          </div>
        </div>
      </section>

      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-none border border-[#2E2822] bg-[#121016] p-1">
          <TabsTrigger
            value="rankings"
            className="rounded-none px-4 py-1.5 font-serif text-xs font-bold data-[state=active]:bg-[#261E0E] data-[state=active]:text-[#E3B94E]"
          >
            全国ランキング
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-none px-4 py-1.5 font-serif text-xs font-bold data-[state=active]:bg-[#261E0E] data-[state=active]:text-[#E3B94E]"
          >
            自分の挑戦履歴 ({save.runHistories.length})
          </TabsTrigger>
        </TabsList>

        {/* === ONLINE RANKINGS === */}
        <TabsContent value="rankings" className="space-y-3">
          <section className="border border-[#2E2822] bg-[#121016] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#E3B94E]" />
                <h2 className="font-serif text-lg font-bold text-[#F2ECE0]">
                  オンラインランキング
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {bestLocalHistory && rankingEnabled && (
                  <button
                    type="button"
                    disabled={submittingId === bestLocalHistory.id}
                    onClick={() => handleSubmitHistoryEntry(bestLocalHistory)}
                    className="inline-flex items-center gap-1.5 border border-[#8A7348] bg-[#261E0E] px-2.5 py-1 font-mono text-[11px] font-bold text-[#E3B94E] hover:bg-[#352A14] disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    <span>自己最高記録を登録</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={loading || !rankingEnabled}
                  onClick={loadRankings}
                  className="inline-flex items-center gap-1 border border-[#3A332A] bg-[#0B0A0E] px-2.5 py-1 font-mono text-[11px] text-[#CFC8B8] hover:border-[#8A7348] hover:text-[#E3B94E] disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                  <span>更新</span>
                </button>
              </div>
            </div>

            {submitMessage && (
              <p className="border border-[#3A332A] bg-[#16131C] px-3 py-1.5 font-mono text-xs text-[#E3B94E]">
                {submitMessage}
              </p>
            )}

            {/* Mode & Stage Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#221D18] pb-3">
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setRankMode("overall")}
                  className={`border px-3 py-1 transition-colors ${
                    rankMode === "overall"
                      ? "border-[#D4AF37] bg-[#261E0E] font-bold text-[#E3B94E]"
                      : "border-[#2E2822] bg-[#0B0A0E] text-[#968E7E] hover:text-[#ECE6D8]"
                  }`}
                >
                  総合ランキング
                </button>
                <button
                  type="button"
                  onClick={() => setRankMode("daily")}
                  className={`border px-3 py-1 transition-colors ${
                    rankMode === "daily"
                      ? "border-[#D4AF37] bg-[#261E0E] font-bold text-[#E3B94E]"
                      : "border-[#2E2822] bg-[#0B0A0E] text-[#968E7E] hover:text-[#ECE6D8]"
                  }`}
                >
                  本日の日替わり{todayDateKey ? ` (${todayDateKey})` : ""}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setStageFilter("all")}
                  className={`border px-2 py-1 ${
                    stageFilter === "all"
                      ? "border-[#8A7348] bg-[#1B1720] text-[#E3B94E]"
                      : "border-[#2A241E] bg-[#0B0A0E] text-[#8E8678]"
                  }`}
                >
                  全迷宮
                </button>
                {[...STAGES, ...SPECIAL_STAGES].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStageFilter(st.id)}
                    className={`border px-2 py-1 ${
                      stageFilter === st.id
                        ? "border-[#8A7348] bg-[#1B1720] text-[#E3B94E]"
                        : "border-[#2A241E] bg-[#0B0A0E] text-[#8E8678]"
                    }`}
                  >
                    {st.name.split("：")[0]}
                  </button>
                ))}
              </div>
            </div>

            {!rankingEnabled ? (
              <p className="py-6 text-center text-xs text-[#8E8678]">
                オンラインランキング機能は現在オフライン設定です。
              </p>
            ) : rankError ? (
              <p className="py-6 text-center text-xs text-[#E05A47]">{rankError}</p>
            ) : loading && entries.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#8E8678]">
                ランキングを読み込み中…
              </p>
            ) : entries.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#8E8678]">
                まだランキング記録がありません。迷宮へ挑んで最初の記録を残しましょう！
              </p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, index) => {
                  const rankNum = index + 1;
                  const dmgFmt = formatJapaneseNumber(entry.maxDamage);
                  const rankBadgeStyle =
                    rankNum === 1
                      ? "border-[#D4AF37] bg-[#2D230B] text-[#F4D06F]"
                      : rankNum === 2
                        ? "border-[#9BA4B5] bg-[#1C2029] text-[#D8DEE9]"
                        : rankNum === 3
                          ? "border-[#A86A3D] bg-[#261810] text-[#E39E6D]"
                          : "border-[#2E2822] bg-[#141218] text-[#968E7E]";

                  return (
                    <div
                      key={entry.id}
                      className="flex flex-col justify-between gap-2 border border-[#2A241E] bg-[#0B0A0E] p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex min-w-[44px] justify-center border px-1.5 py-0.5 font-mono text-xs font-bold ${rankBadgeStyle}`}
                          >
                            {rankNum}位
                          </span>
                          <span className="truncate font-serif text-sm font-bold text-[#F2ECE0]">
                            {entry.playerName}
                          </span>
                          <span
                            className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                              entry.cleared
                                ? "border-[#2F7D5B] bg-[#11221B] text-[#57B889]"
                                : "border-[#5C3530] bg-[#261A19] text-[#E05A47]"
                            }`}
                          >
                            {entry.cleared ? "踏破" : "挑戦"}
                          </span>
                          {entry.isDaily && (
                            <span className="border border-[#8A7348] bg-[#1E170A] px-1.5 py-0.5 font-mono text-[10px] text-[#E3B94E]">
                              日替わり
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#968E7E]">
                          <span>{entry.stageName}</span>
                          <span className="font-mono">第{entry.reachedFloor}階</span>
                          <span className="font-mono text-[10px] text-[#6B6458]">
                            {new Date(entry.createdAt).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        {entry.relicIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {entry.relicIds.slice(0, 8).map((id, idx) => (
                              <span
                                key={`${id}_${idx}`}
                                className="border border-[#2E2822] bg-[#141218] px-1.5 py-0.5 text-[10px] text-[#B4ABA0]"
                              >
                                {getRelicDef(id)?.name ?? id}
                              </span>
                            ))}
                            {entry.relicIds.length > 8 && (
                              <span className="font-mono text-[10px] text-[#787166]">
                                +{entry.relicIds.length - 8}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-right font-mono">
                        <span className="block text-[10px] text-[#8E8678]">最大一撃</span>
                        <span className={`text-lg font-bold ${dmgFmt.colorClass}`}>
                          {dmgFmt.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </TabsContent>

        {/* === LOCAL RUN HISTORY === */}
        <TabsContent value="history">
          <section className="border border-[#2E2822] bg-[#121016] p-4 space-y-3">
            <h2 className="font-serif text-lg font-bold text-[#F2ECE0]">
              最近の迷宮挑戦履歴
            </h2>
            {save.runHistories.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#8E8678]">
                まだ迷宮の挑戦記録がありません。「迷宮」からダンジョンへ挑みましょう。
              </p>
            ) : (
              <div className="space-y-2">
                {save.runHistories.map((h) => {
                  const dmgFmt = formatJapaneseNumber(h.maxDamage);
                  return (
                    <div
                      key={h.id}
                      className="flex flex-col justify-between gap-2 border border-[#2A241E] bg-[#0B0A0E] p-3 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                              h.cleared
                                ? "border-[#2F7D5B] bg-[#11221B] text-[#57B889]"
                                : "border-[#5C3530] bg-[#261A19] text-[#E05A47]"
                            }`}
                          >
                            {h.cleared ? "踏破" : "敗退"}
                          </span>
                          <span className="font-serif text-sm font-bold text-[#F2ECE0]">
                            {h.stageName}
                          </span>
                          <span className="font-mono text-xs text-[#968E7E]">
                            第{h.reachedFloor}階
                          </span>
                        </div>
                        {h.relicIds.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {h.relicIds.map((id, idx) => (
                              <span
                                key={`${id}_${idx}`}
                                className="border border-[#3A332A] bg-[#141218] px-1.5 py-0.5 text-[10px] text-[#CFC8B8]"
                              >
                                {getRelicDef(id)?.name ?? id}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        {rankingEnabled && h.maxDamage > 0 && (
                          <button
                            type="button"
                            disabled={submittingId === h.id}
                            onClick={() => handleSubmitHistoryEntry(h)}
                            className="border border-[#3A332A] bg-[#141218] px-2 py-1 font-mono text-[10px] text-[#CFC8B8] hover:border-[#8A7348] hover:text-[#E3B94E] disabled:opacity-50"
                          >
                            順位送信
                          </button>
                        )}
                        <div className="text-right font-mono">
                          <span className="block text-[10px] text-[#8E8678]">最大一撃</span>
                          <span className={`text-base font-bold ${dmgFmt.colorClass}`}>
                            {dmgFmt.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
