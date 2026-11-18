"use client";

import { useSaveData } from "@/components/GameShell";
import { ACHIEVEMENTS } from "@/data/achievements";
import { getRelicDef } from "@/data/relics";
import { formatJapaneseNumber } from "@/lib/bignum";

export default function RecordsPage() {
  const { save } = useSaveData();
  const bestFmt = formatJapaneseNumber(save.bestDamage);

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
          最大一撃出力と過去の迷宮挑戦履歴を確認できます（オンライン順位は会員機能追加時に同期）。
        </p>
      </section>

      {/* HyperUI-style Stat Grid */}
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

      {/* Run History Table */}
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
                    <div className="flex items-center gap-2">
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
                        {h.relicIds.map((id) => (
                          <span
                            key={id}
                            className="border border-[#3A332A] bg-[#141218] px-1.5 py-0.5 text-[10px] text-[#CFC8B8]"
                          >
                            {getRelicDef(id)?.name ?? id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right font-mono">
                    <span className="block text-[10px] text-[#8E8678]">最大一撃</span>
                    <span className={`text-base font-bold ${dmgFmt.colorClass}`}>
                      {dmgFmt.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
