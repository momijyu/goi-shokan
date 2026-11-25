"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertOctagon,
  Bookmark,
  BookMarked,
  Calendar,
  ChevronDown,
  ChevronRight,
  Compass,
  FileText,
  Flame,
  Heart,
  Layers,
  Loader2,
  RotateCcw,
  Shield,
  Shuffle,
  Skull,
  Sparkles,
  Sword,
  X,
  Zap,
} from "lucide-react";
import { useSaveData } from "@/components/GameShell";
import {
  AnimatedEnemySprite,
  PlayerStripOverlay,
  type CombatVisualEffect,
} from "@/components/BattleStageEffects";
import { WordCard } from "@/components/WordCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SPECIAL_STAGES, STAGES } from "@/data/enemies";
import { getWordMaster } from "@/data/words";
import { analyzeTextForPack, MINING_SAMPLE_TEXTS } from "@/lib/analyzer";
import { formatJapaneseNumber, getTodayJstDateKey } from "@/lib/bignum";
import {
  chooseCardReward,
  chooseRelicReward,
  endPlayerTurn,
  getDynamicSkillPreview,
  getEffectiveCardCost,
  getEnemyCurrentIntent,
  getPostFloorEvent,
  getRelicLabels,
  isEnglishCardTerm,
  playCardFromHand,
  proceedNextBattleFloor,
  RANDOM_STYLE_META,
  resolveCovenantEvent,
  resolveLibraryEvent,
  startNewRun,
  type RandomDeckStyle,
  type RunState,
  type StartRunOptions,
} from "@/lib/battleEngine";
import { submitRankingScore } from "@/lib/rankings";
import {
  applyDeckPresetInSave,
  applyMiningPackToSave,
  loadActiveRunState,
  recordRunResultInSave,
  saveActiveRunState,
} from "@/lib/storage";
import {
  ATTR_META,
  getEffectiveStats,
  PLUS_STAT_STEP,
  RANK_META,
  SKILL_META,
  type CommandRole,
  type RelicDef,
} from "@/types/game";

interface RouteNodeItem {
  key: string;
  kind: "battle" | "boss" | "library" | "covenant";
  label: string;
  title: string;
  status: "done" | "current" | "upcoming";
}

function buildDungeonRouteNodes(run: RunState): RouteNodeItem[] {
  const nodes: RouteNodeItem[] = [];
  const startFloor = run.isEndless
    ? Math.max(run.totalStageFloors + 1, run.floor - 1)
    : 1;
  const endFloor = run.isEndless ? run.floor + 2 : run.totalStageFloors;

  for (let f = startFloor; f <= endFloor; f += 1) {
    const isBoss =
      (!run.isEndless && f === run.totalStageFloors) ||
      (run.isEndless && (f - run.totalStageFloors) % 3 === 0);
    const inPostEvent =
      run.phase === "event_library" ||
      run.phase === "event_covenant" ||
      run.phase === "stage_clear";

    const battleStatus: RouteNodeItem["status"] =
      run.floor > f || (run.floor === f && inPostEvent)
        ? "done"
        : run.floor === f
          ? "current"
          : "upcoming";

    nodes.push({
      key: `battle_${f}`,
      kind: isBoss ? "boss" : "battle",
      label: run.isEndless
        ? isBoss
          ? `無間${f - run.totalStageFloors}・主`
          : `無間${f - run.totalStageFloors}`
        : isBoss
          ? "主"
          : `${f}戦`,
      title: run.isEndless
        ? `無間${f - run.totalStageFloors}（通算 第${f}階）${isBoss ? " ボス・遺物ドロップ" : ""}`
        : isBoss
          ? `第${f}階 ボス`
          : `第${f}階 戦闘（遺物ドロップ）`,
      status: battleStatus,
    });

    const post = getPostFloorEvent(run.totalStageFloors, f, run.isEndless);
    if (post === "library") {
      nodes.push({
        key: `lib_${f}`,
        kind: "library",
        label: "書庫",
        title: "静寂の書庫（休息・デッキ圧縮・強化）",
        status:
          run.floor > f
            ? "done"
            : run.floor === f && run.phase === "event_library"
              ? "current"
              : "upcoming",
      });
    } else if (post === "covenant") {
      const hasBlack = run.relicIds.some((id) => id.startsWith("black_pact_"));
      const hasWhite = run.relicIds.some((id) =>
        id.startsWith("white_revelation_")
      );
      nodes.push({
        key: `cov_${f}`,
        kind: "covenant",
        label: hasWhite ? "天啓" : hasBlack ? "契約" : "祭壇",
        title: hasWhite
          ? "白き天啓の祭壇"
          : hasBlack
            ? "黒き契約の祭壇"
            : "黒き契約 / 白き天啓の祭壇",
        status:
          run.floor > f
            ? "done"
            : run.floor === f && run.phase === "event_covenant"
              ? "current"
              : "upcoming",
      });
    }
  }
  return nodes;
}

function getTransitionBannerText(run: RunState): string {
  const floorLabel = run.isEndless
    ? `第${run.floor}階（無間${run.floor - run.totalStageFloors}）`
    : `第${run.floor}階`;
  switch (run.phase) {
    case "battle":
      return run.enemy.isBoss
        ? `${floorLabel} 最奥到達 — ${run.enemy.name} が立ち塞がる！`
        : `${floorLabel}へ進入 — ${run.enemy.name} と交戦中`;
    case "reward_card":
      return `${floorLabel} 勝利 — 戦利品の語彙を選択`;
    case "reward_relic":
      return `${floorLabel} 勝利 — 遺物（レリック）を選択`;
    case "event_library":
      return "静寂の書庫へ到着 — 休息・デッキ圧縮（削除）・強化が可能";
    case "event_covenant":
      return run.covenantOfferedBlack && run.covenantOfferedWhite
        ? "運命の祭壇へ到達 — 黒き禁忌か、白き天啓か"
        : run.covenantOfferedWhite
          ? "白き天啓の祭壇 — 純粋なる言霊の祝福"
          : "黒き契約の祭壇 — 代償と引き換えの禁忌";
    case "stage_clear":
      return `${run.stageName} 完全踏破！`;
    case "gameover":
      return `第${run.floor}階にて言霊霧散`;
  }
}

function renderRunMultiplierRows(run: RunState) {
  return (
    <div className="space-y-2 font-mono text-xs">
      <div className="flex justify-between">
        <span className="text-[#968E7E]">基礎加算</span>
        <span className="text-[#ECE6D8]">
          +{formatJapaneseNumber(run.battleFlatAdd).text}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-[#968E7E]">戦闘乗算</span>
        <span className="font-bold text-[#E3B94E]">
          ×{formatJapaneseNumber(run.battleMult).text}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-[#968E7E]">次札乗算</span>
        <span className="text-[#57B889]">×{run.nextCardMult.toFixed(2)}</span>
      </div>
      {run.permanentBaseMult > 1 && (
        <div className="flex justify-between">
          <span className="text-[#968E7E]">永続基礎倍率</span>
          <span className="font-bold text-[#E88A38]">
            ×{formatJapaneseNumber(run.permanentBaseMult).text}
          </span>
        </div>
      )}
      {run.battleGuardMult > 1 && (
        <div className="flex justify-between">
          <span className="text-[#968E7E]">戦闘防御倍率</span>
          <span className="font-bold text-[#5B9BD5]">
            ×{run.battleGuardMult.toFixed(2)}
          </span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-[#968E7E]">永続基礎値</span>
        <span className="font-bold text-[#9BD1B5]">
          +{formatJapaneseNumber(run.permanentFlatAdd).text}
        </span>
      </div>
      {run.tengenPermanentMult > 1 && (
        <div className="flex justify-between">
          <span className="text-[#968E7E]">天元永続倍率</span>
          <span className="font-bold text-[#F4D06F]">
            ×{formatJapaneseNumber(run.tengenPermanentMult).text}
          </span>
        </div>
      )}
      {run.permanentMultBonus > 1 && (
        <div className="flex justify-between">
          <span className="text-[#968E7E]">永続昇格倍率</span>
          <span className="font-bold text-[#69A3D9]">
            ×{formatJapaneseNumber(run.permanentMultBonus).text}
          </span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-[#968E7E]">ラン累計発動</span>
        <span className="text-[#CFC8B8]">{run.totalCardsPlayedInRun}回</span>
      </div>
      <div className="flex justify-between border-t border-[#2A241E] pt-2">
        <span className="text-[#968E7E]">ラン最大出力</span>
        <span className="font-bold text-[#E3B94E]">
          {formatJapaneseNumber(run.maxDamageDealt).text}
        </span>
      </div>
    </div>
  );
}

let activeRunCache: RunState | null | undefined;
const activeRunListeners = new Set<() => void>();

function subscribeActiveRun(listener: () => void): () => void {
  activeRunListeners.add(listener);
  return () => activeRunListeners.delete(listener);
}

function getClientActiveRunSnapshot(): RunState | null {
  if (activeRunCache === undefined) {
    activeRunCache = loadActiveRunState();
  }
  return activeRunCache;
}

function getServerActiveRunSnapshot(): RunState | null {
  return null;
}

function writeActiveRunSnapshot(next: RunState | null): void {
  activeRunCache = next;
  saveActiveRunState(next);
  activeRunListeners.forEach((l) => l());
}

export default function DungeonPage() {
  const { save, hydrated, setSave, setMobileBattleFullscreen } = useSaveData();
  const run = useSyncExternalStore(
    subscribeActiveRun,
    getClientActiveRunSnapshot,
    getServerActiveRunSnapshot
  );
  const setRun = writeActiveRunSnapshot;
  const recordedRunIdsRef = useRef<Set<string>>(new Set());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [relicModalOpen, setRelicModalOpen] = useState(false);
  const [hudModalOpen, setHudModalOpen] = useState(false);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [deckTab, setDeckTab] = useState<"all" | "draw" | "discard">("all");
  const [activeRelicDetail, setActiveRelicDetail] = useState<RelicDef | null>(null);
  const [routeOpenMobile, setRouteOpenMobile] = useState(false);
  const [selectedRewardCardId, setSelectedRewardCardId] = useState<string | null>(null);
  const [selectedLibraryCardId, setSelectedLibraryCardId] = useState<string | null>(null);
  const [randomStyle, setRandomStyle] = useState<RandomDeckStyle>("chaos");
  const [impromptuText, setImpromptuText] = useState("");
  const [impromptuLoading, setImpromptuLoading] = useState(false);
  const [impromptuError, setImpromptuError] = useState<string | null>(null);
  const [lobbyTab, setLobbyTab] = useState<"standard" | "special">("standard");
  const [combatFx, setCombatFx] = useState<CombatVisualEffect | null>(null);
  const [pendingVictoryRun, setPendingVictoryRun] = useState<RunState | null>(null);
  const fxCounterRef = useRef(0);
  const enemyMotionCounterRef = useRef(0);
  const victoryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMobileBattleFullscreen(Boolean(run));
    return () => setMobileBattleFullscreen(false);
  }, [run, setMobileBattleFullscreen]);

  useEffect(() => {
    return () => {
      if (victoryTimerRef.current !== null) {
        window.clearTimeout(victoryTimerRef.current);
      }
    };
  }, []);

  const clearVictoryTransition = () => {
    if (victoryTimerRef.current !== null) {
      window.clearTimeout(victoryTimerRef.current);
      victoryTimerRef.current = null;
    }
    setPendingVictoryRun(null);
  };

  const flushPendingVictory = () => {
    if (victoryTimerRef.current !== null) {
      window.clearTimeout(victoryTimerRef.current);
      victoryTimerRef.current = null;
    }
    if (pendingVictoryRun) {
      setRun(pendingVictoryRun);
      setPendingVictoryRun(null);
    }
  };

  const emitCombatFx = (fx: Omit<CombatVisualEffect, "id" | "floor" | "enemyMotionId">) => {
    fxCounterRef.current += 1;
    if (
      fx.kind === "attack" ||
      fx.kind === "pierce" ||
      fx.kind === "enemy_attack" ||
      fx.kind === "enemy_blocked"
    ) {
      enemyMotionCounterRef.current += 1;
    }
    setCombatFx({
      ...fx,
      id: fxCounterRef.current,
      enemyMotionId: enemyMotionCounterRef.current,
      floor: run?.floor,
    });
  };

  const finalizeRunRecord = (finalRun: RunState, cleared: boolean) => {
    if (
      recordedRunIdsRef.current.has(finalRun.runId) ||
      save.runHistories.some((h) => h.id === finalRun.runId)
    ) {
      return;
    }
    recordedRunIdsRef.current.add(finalRun.runId);
    const resolvedDailyDate = finalRun.isDaily
      ? (finalRun.dailyDate ?? getTodayJstDateKey())
      : null;

    const hadWhite = finalRun.relicIds.some((id) => id.startsWith("white_revelation"));
    const hadBlack = finalRun.relicIds.some((id) => id.startsWith("black_pact_"));
    const hadF = finalRun.deck.some((c) => c.rank === "F");
    const englishCardCount = finalRun.deck.filter((c) =>
      isEnglishCardTerm(c.term)
    ).length;
    const nextSave = recordRunResultInSave(save, {
      history: {
        id: finalRun.runId,
        stageId: finalRun.stageId,
        stageName: finalRun.stageName,
        isDaily: finalRun.isDaily,
        dailyDate: resolvedDailyDate,
        cleared,
        reachedFloor: finalRun.floor,
        maxDamage: finalRun.maxDamageDealt,
        relicIds: finalRun.relicIds,
        createdAt: new Date().toISOString(),
      },
      discoveredRelics: finalRun.relicIds,
      encounteredEnemies: finalRun.encounteredEnemyIds,
      hadWhiteRevelation: hadWhite,
      hadBlackCovenant: hadBlack,
      hadFCardInDeck: hadF,
      englishCardCount,
      deckSize: finalRun.deck.length,
    });
    setSave(nextSave);
    if (finalRun.maxDamageDealt > 0) {
      void submitRankingScore({
        runId: finalRun.runId,
        playerName: save.guestName,
        stageId: finalRun.stageId,
        stageName: finalRun.stageName,
        isDaily: finalRun.isDaily,
        dailyDate: resolvedDailyDate,
        cleared,
        reachedFloor: finalRun.floor,
        maxDamage: finalRun.maxDamageDealt,
        relicIds: finalRun.relicIds,
      });
    }
  };

  const handleStartStage = (
    stageId: string,
    isDaily: boolean,
    options?: StartRunOptions
  ) => {
    clearVictoryTransition();
    setCombatFx(null);
    const newRun = startNewRun(save, stageId, isDaily, options);
    setRun(newRun);
    setSelectedCardId(null);
    setSelectedRewardCardId(null);
    setSelectedLibraryCardId(null);
  };

  const handleStartImpromptu = async () => {
    if (impromptuLoading) return;
    const trimmed = impromptuText.trim();
    if (!trimmed) {
      setImpromptuError("戦闘に使う文章を入力（またはサンプルを選択）してください。");
      return;
    }
    setImpromptuLoading(true);
    setImpromptuError(null);
    try {
      const summary = await analyzeTextForPack(trimmed, 20);
      if (summary.packCards.length < 6 || !summary.hasPredicate) {
        setImpromptuError(
          summary.packCards.length === 0
            ? "抽出できる語彙が見つかりませんでした。もう少し日本語の名詞・動詞・形容詞を含めてください。"
            : summary.packCards.length < 6
              ? `抽出された語彙が ${summary.packCards.length}語 でした。一文即興の迷宮では6語以上の語彙が含まれる文章を入力してください。`
              : "名詞の羅列ではなく、動詞・形容詞などを含む一文を入力してください。"
        );
        return;
      }
      const applied = applyMiningPackToSave(save, summary.packCards, trimmed, {
        registerNewOnlyOnDuplicate: true,
      });
      setSave(applied.next);
      clearVictoryTransition();
      setCombatFx(null);
      const newRun = startNewRun(applied.next, "stage_impromptu", false, {
        mode: "impromptu",
        impromptuEntries: summary.packCards.map((c) => c.entry),
      });
      setRun(newRun);
      setSelectedCardId(null);
      setSelectedRewardCardId(null);
      setSelectedLibraryCardId(null);
    } catch {
      setImpromptuError("形態素辞書の読み込みに失敗しました。再試行してください。");
    } finally {
      setImpromptuLoading(false);
    }
  };

  const handlePlayCommand = (role: CommandRole) => {
    if (!run || !selectedCardId) return;
    if (pendingVictoryRun) {
      flushPendingVictory();
      return;
    }
    const playedCard =
      run.hand.find((c) => c.instanceId === selectedCardId) ?? null;
    const nextRun = playCardFromHand(run, selectedCardId, role, save);
    if (nextRun === run) return;

    const out = nextRun.lastOutput;
    const isLethal = nextRun.phase !== "battle" && nextRun.enemyHp <= 0;

    if (out && (out.role === "attack" || out.didDamage)) {
      const fmt = formatJapaneseNumber(out.finalOutput);
      const isPierce = Boolean(
        playedCard &&
          ((playedCard.attribute === "logic" &&
            (playedCard.rank === "SSR" || playedCard.rank === "UR")) ||
            (out.role === "skill" && playedCard.skillType === "pierce_burst"))
      );
      const subLabel = isPierce
        ? out.retriggers > 1
          ? `貫通・${out.retriggers}連!`
          : "貫通!"
        : out.retriggers > 1
          ? `${out.retriggers}連撃!`
          : undefined;
      emitCombatFx({
        kind: isPierce ? "pierce" : "attack",
        amountText: fmt.text,
        subLabel,
        colorClass: fmt.colorClass,
        shakeLevel: fmt.shakeLevel,
        retriggers: out.retriggers,
        attribute: playedCard?.attribute,
        isLethal,
      });
    } else if (out && (out.role === "guard" || out.didShield)) {
      const fmt = formatJapaneseNumber(out.finalOutput);
      emitCombatFx({
        kind: "guard",
        amountText: fmt.text,
        colorClass: "text-[#69A3D9]",
        shakeLevel: 0,
        retriggers: out.retriggers,
        attribute: playedCard?.attribute,
      });
    } else if (out) {
      emitCombatFx({
        kind: "skill",
        amountText: `${out.cardTerm} 発動`,
        colorClass: "text-[#E3B94E]",
        shakeLevel: 0,
        retriggers: out.retriggers,
        attribute: playedCard?.attribute,
      });
    }

    setSelectedCardId(null);

    if (isLethal) {
      setRun({
        ...run,
        enemyHp: 0,
        enemyShield: 0,
        lastOutput: nextRun.lastOutput,
        cardsPlayedThisTurn: nextRun.cardsPlayedThisTurn,
        logs: nextRun.logs,
      });
      setPendingVictoryRun(nextRun);
      victoryTimerRef.current = window.setTimeout(() => {
        victoryTimerRef.current = null;
        setPendingVictoryRun(null);
        setRun(nextRun);
      }, 560);
      return;
    }

    setRun(nextRun);
  };

  const handleEndTurn = () => {
    if (!run) return;
    if (pendingVictoryRun) {
      flushPendingVictory();
      return;
    }
    const prevIntent = getEnemyCurrentIntent(run);
    const nextRun = endPlayerTurn(run);
    if (nextRun.phase === "gameover") {
      finalizeRunRecord(nextRun, nextRun.isEndless);
      setRun(nextRun);
      setSelectedCardId(null);
      return;
    }

    if (prevIntent.type === "attack" || prevIntent.type === "heavy_attack") {
      const dmgTaken = Math.max(0, prevIntent.value - run.playerShield);
      if (dmgTaken > 0) {
        emitCombatFx({
          kind: "enemy_attack",
          amountText: formatJapaneseNumber(dmgTaken).text,
          colorClass: "text-[#F7B5AD]",
          shakeLevel: prevIntent.type === "heavy_attack" ? 2 : 1,
          retriggers: 1,
        });
      } else {
        emitCombatFx({
          kind: "enemy_blocked",
          amountText: "完全防御",
          colorClass: "text-[#89CFF0]",
          shakeLevel: 0,
          retriggers: 1,
        });
      }
    } else if (prevIntent.type === "defend") {
      emitCombatFx({
        kind: "enemy_guard",
        amountText: `盾+${formatJapaneseNumber(prevIntent.value).text}`,
        colorClass: "text-[#69A3D9]",
        shakeLevel: 0,
        retriggers: 1,
      });
    }

    setRun(nextRun);
    setSelectedCardId(null);
  };

  const handleRetireRun = () => {
    clearVictoryTransition();
    setCombatFx(null);
    if (run && run.phase !== "gameover" && run.maxDamageDealt > 0) {
      finalizeRunRecord(run, run.phase === "stage_clear" || run.isEndless);
    }
    setRun(null);
    setSelectedCardId(null);
  };

  // === LOBBY VIEW ===
  if (!run) {
    const aceWord =
      save.ownedWords[save.aceTerm] ?? getWordMaster(save.aceTerm) ?? getWordMaster("示唆")!;
    const presets = save.deckPresets ?? [];
    const activePreset = presets.find((p) => p.id === save.activePresetId) ?? null;

    return (
      <div className="space-y-4 sm:space-y-6">
        <section className="kaku-frame p-3.5 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[10px] tracking-[0.25em] text-[#8A7348]">
                PHASE 02 // DUNGEON LOBBY
              </p>
              <h1 className="mt-1 font-serif text-xl font-extrabold text-[#F2ECE0] sm:text-3xl">
                迷宮選択 ＆ 出撃準備
              </h1>
              <p className="mt-1 hidden text-xs text-[#A89F8E] lg:block">
                所持語彙から毎回ランダム選出（常×4・良×2）＋エース1枚で潜入。道中でマイ辞書（{save.deckPoolTerms.length}枚）から3択ドロップし、遺物の組み合わせで強大な言霊を構築せよ。
              </p>
            </div>
            <Link
              href="/deck"
              className="hidden shrink-0 items-center justify-center gap-2 border border-[#8A7348] bg-[#261E0E] px-4 py-2 font-serif text-xs font-bold text-[#E3B94E] hover:bg-[#352A14] lg:inline-flex"
            >
              <span>マイ辞書・エース変更</span>
            </Link>
          </div>
        </section>

        {/* Mobile Mode Tabs (PC shows all sections together) */}
        <div
          role="tablist"
          aria-label="迷宮モード切替"
          className="grid grid-cols-2 border border-[#2E2822] bg-[#0E0D12] lg:hidden"
        >
          <button
            type="button"
            role="tab"
            aria-selected={lobbyTab === "standard"}
            onClick={() => setLobbyTab("standard")}
            className={`border-b-2 px-2 py-2.5 text-center font-serif text-xs font-bold transition-colors ${
              lobbyTab === "standard"
                ? "border-b-[#E3B94E] bg-[#1C1814] text-[#F4D06F]"
                : "border-b-transparent text-[#8E8678] hover:text-[#CFC8B8]"
            }`}
          >
            通常迷宮（マイ辞書）
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={lobbyTab === "special"}
            onClick={() => setLobbyTab("special")}
            className={`inline-flex items-center justify-center gap-1 border-b-2 px-2 py-2.5 font-serif text-xs font-bold transition-colors ${
              lobbyTab === "special"
                ? "border-b-[#57B889] bg-[#111D18] text-[#9BD1B5]"
                : "border-b-transparent text-[#8E8678] hover:text-[#CFC8B8]"
            }`}
          >
            <Shuffle className="h-3.5 w-3.5 shrink-0" />
            <span>特殊（無作為・一文）</span>
          </button>
        </div>

        {/* Mobile Compact Deck/Ace & Preset Bar (Only shown in Standard tab) */}
        <div
          className={`flex-col gap-2 border border-[#2E2822] bg-[#121016] px-3 py-2 lg:hidden ${
            lobbyTab === "standard" ? "flex" : "hidden"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-mono text-[11px] text-[#E3B94E]">
              ★ エース：{aceWord.term}（辞書 {save.deckPoolTerms.length}/30）
            </span>
            <Link
              href="/deck"
              className="shrink-0 border border-[#8A7348] bg-[#261E0E] px-2.5 py-1 font-serif text-[11px] font-bold text-[#E3B94E] hover:bg-[#352A14]"
            >
              変更・保存
            </Link>
          </div>
          {presets.length > 0 && (
            <div className="flex items-center gap-2 border-t border-[#221D18] pt-1.5">
              <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-[#8A7348]">
                <Bookmark className="h-3 w-3" />
                プリセット
              </span>
              <select
                aria-label="出撃プリセット選択"
                value={activePreset?.id ?? ""}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setSave(applyDeckPresetInSave(save, e.target.value));
                }}
                className="min-w-0 flex-1 border border-[#3A332A] bg-[#0B0A0E] px-2 py-1 font-mono text-[11px] text-[#ECE6D8] focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="" disabled>
                  現在の編成（未選択）
                </option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（★{p.aceTerm}・{p.deckPoolTerms.length}枚）
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Daily Labyrinth Banner */}
        <section
          className={`border border-[#C93A2B] bg-[#180E10] p-4 sm:p-5 ${
            lobbyTab === "standard" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#E05A47]">
                <Calendar className="h-4 w-4" />
                <span>DAILY LABYRINTH // {hydrated ? getTodayJstDateKey() : "TODAY"}</span>
              </div>
              <h2 className="mt-1 font-serif text-xl font-extrabold text-[#F2ECE0]">
                本日の日替わり迷宮
              </h2>
              <p className="mt-1 text-xs text-[#CFC8B8]">
                毎日同じ敵配置・同じ乱数シードで挑む特別迷宮。現在の自己最高ダメージで順位を刻め。
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleStartStage("stage_2", true)}
              className="shrink-0 border border-[#E3B94E] bg-[#C93A2B] px-5 py-3 font-serif text-sm font-extrabold tracking-wider text-[#F7F3EA] transition-colors hover:bg-[#A62D20]"
            >
              日替わり迷宮へ潜る
            </button>
          </div>
        </section>

        {/* Normal Stages + PC Ace Preview */}
        <div
          className={
            lobbyTab === "standard"
              ? "grid gap-4 lg:grid-cols-3"
              : "hidden gap-4 lg:grid lg:grid-cols-3"
          }
        >
          <div className="space-y-3 lg:col-span-2">
            {STAGES.map((stage) => {
              const isCleared = save.clearedStages.includes(stage.id);
              return (
                <div
                  key={stage.id}
                  className="kaku-frame flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#8A7348]">
                        全{stage.totalFloors}階層
                      </span>
                      {hydrated && save.runHistories.length === 0 && stage.id === "stage_1" && (
                        <span className="border border-[#D4AF37] bg-[#261E0E] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#F4D06F]">
                          初挑戦におすすめ
                        </span>
                      )}
                      {isCleared && (
                        <span className="border border-[#2F7D5B] bg-[#11221B] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#57B889]">
                          踏破済
                        </span>
                      )}
                    </div>
                    <h3 className="mt-0.5 font-serif text-lg font-extrabold text-[#F2ECE0]">
                      {stage.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#A89F8E]">{stage.subtitle}</p>
                    <p className="mt-1 font-mono text-[11px] text-[#8E8678]">
                      目安：{stage.recommendedPower}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartStage(stage.id, false)}
                    className="shrink-0 border border-[#8A7348] bg-[#1D1924] px-5 py-2.5 font-serif text-sm font-bold text-[#E3B94E] transition-colors hover:border-[#D4AF37] hover:bg-[#2B2434]"
                  >
                    挑戦する
                  </button>
                </div>
              );
            })}
          </div>

          {/* Current Ace & Preset Switcher (PC sidebar only; mobile shows compact bar above) */}
          <div className="hidden space-y-4 border border-[#2E2822] bg-[#121016] p-4 lg:block">
            <div className="space-y-1.5 border-b border-[#221D18] pb-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-widest text-[#8A7348]">
                  <Bookmark className="h-3 w-3" />
                  出撃プリセット
                </span>
                <Link
                  href="/deck"
                  className="font-mono text-[10px] text-[#E3B94E] hover:underline"
                >
                  管理 →
                </Link>
              </div>
              {presets.length > 0 ? (
                <select
                  aria-label="PC出撃プリセット選択"
                  value={activePreset?.id ?? ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setSave(applyDeckPresetInSave(save, e.target.value));
                  }}
                  className="w-full border border-[#3A332A] bg-[#0B0A0E] px-2.5 py-1.5 font-mono text-xs text-[#ECE6D8] focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="" disabled>
                    現在の編成（未保存）
                  </option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}（★{p.aceTerm}・{p.deckPoolTerms.length}枚）
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] text-[#787166]">
                  「マイ辞書」で編成をプリセット保存するとここから即切替できます。
                </p>
              )}
            </div>

            <div>
              <p className="font-mono text-[10px] tracking-widest text-[#8A7348]">
                持ち込みエース（1枚）
              </p>
              <div className="mt-3 max-w-[200px]">
                <WordCard word={aceWord} isAce />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#968E7E]">
                迷宮のドロップ候補：マイ辞書{" "}
                <strong className="font-mono text-[#ECE6D8]">
                  {save.deckPoolTerms.length}/30
                </strong>{" "}
                語
              </p>
            </div>
          </div>
        </div>

        {/* Special Modes: Full Random & One-Text Impromptu */}
        <section
          className={lobbyTab === "special" ? "space-y-3" : "hidden space-y-3 lg:block"}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-[#8A7348]">
                SPECIAL LABYRINTHS // 即興・変則ルール迷宮
              </p>
              <h2 className="font-serif text-lg font-extrabold text-[#F2ECE0]">
                マイ辞書不要の特殊迷宮
              </h2>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Mode 1: Random Draft Labyrinth */}
            {(() => {
              const randomStage = SPECIAL_STAGES[0];
              const isCleared = save.clearedStages.includes(randomStage.id);
              const activeStyleMeta =
                RANDOM_STYLE_META.find((s) => s.id === randomStyle) ??
                RANDOM_STYLE_META[0];
              return (
                <div className="kaku-frame flex flex-col justify-between gap-3 p-4">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#57B889]">
                        <Shuffle className="h-3.5 w-3.5" />
                        <span>RANDOM DRAFT // 全{randomStage.totalFloors}階</span>
                      </span>
                      {isCleared && (
                        <span className="border border-[#2F7D5B] bg-[#11221B] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#57B889]">
                          踏破済
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-extrabold text-[#F2ECE0]">
                        {randomStage.name}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#A89F8E]">
                        {randomStage.subtitle}（未所持カードは今回限りの「お試し」で登場）
                      </p>
                    </div>

                    <div className="space-y-1.5 border-t border-[#2A241E] pt-2.5">
                      <span className="block font-mono text-[10px] text-[#8A7348]">
                        デッキ抽選スタイルを選択：
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {RANDOM_STYLE_META.map((st) => {
                          const active = randomStyle === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setRandomStyle(st.id)}
                              className={`border px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors ${
                                active
                                  ? "border-[#57B889] bg-[#11221B] font-bold text-[#9BD1B5]"
                                  : "border-[#3A332A] bg-[#141218] text-[#B4ABA0] hover:border-[#8A7348]"
                              }`}
                            >
                              {st.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="font-mono text-[10px] text-[#968E7E]">
                        {activeStyleMeta.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleStartStage(randomStage.id, false, {
                        mode: "random",
                        randomStyle,
                      })
                    }
                    className="w-full border border-[#57B889] bg-[#11221B] py-2.5 font-serif text-sm font-extrabold tracking-wider text-[#9BD1B5] transition-colors hover:bg-[#173026]"
                  >
                    無作為迷宮へ挑む
                  </button>
                </div>
              );
            })()}

            {/* Mode 2: One-Text Impromptu Labyrinth */}
            {(() => {
              const impromptuStage = SPECIAL_STAGES[1];
              const isCleared = save.clearedStages.includes(impromptuStage.id);
              return (
                <div className="kaku-frame flex flex-col justify-between gap-3 p-4">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#E3B94E]">
                        <FileText className="h-3.5 w-3.5" />
                        <span>ONE-TEXT ARENA // 全{impromptuStage.totalFloors}階</span>
                      </span>
                      {isCleared && (
                        <span className="border border-[#2F7D5B] bg-[#11221B] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#57B889]">
                          踏破済
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-extrabold text-[#F2ECE0]">
                        {impromptuStage.name}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#A89F8E]">
                        入力した文章から解析された語彙だけで戦う限定戦。解析語は所持・図鑑へ登録され、道中報酬には同文内の語彙（お試し／強化版）のみ出現します。
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {MINING_SAMPLE_TEXTS.map((s) => {
                          const selected = impromptuText === s.text;
                          return (
                            <button
                              key={s.label}
                              type="button"
                              onClick={() => {
                                setImpromptuText(selected ? "" : s.text);
                                setImpromptuError(null);
                              }}
                              className={`border px-2 py-1 text-[10px] transition-colors ${
                                selected
                                  ? "border-[#D4AF37] bg-[#261E0E] font-bold text-[#E3B94E]"
                                  : "border-[#3A332A] bg-[#18151E] text-[#CFC8B8] hover:border-[#8A7348]"
                              }`}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        value={impromptuText}
                        onChange={(e) => {
                          setImpromptuText(e.target.value);
                          if (impromptuError) setImpromptuError(null);
                        }}
                        maxLength={2500}
                        rows={3}
                        placeholder="戦闘に使う1つの文章を入力してください（6語以上・最大2,500文字）..."
                        className="w-full resize-y border border-[#322C26] bg-[#0B0A0E] p-2.5 text-xs leading-relaxed text-[#F2ECE0] placeholder:text-[#787166] focus:border-[#D4AF37] focus:outline-none"
                      />
                      <div className="flex items-center justify-between font-mono text-[10px] text-[#968E7E]">
                        <span>文字数: {impromptuText.length} / 2,500</span>
                        {impromptuText.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setImpromptuText("");
                              setImpromptuError(null);
                            }}
                            className="inline-flex items-center gap-1 border border-[#3A332A] bg-[#18151E] px-1.5 py-0.5 text-[10px] text-[#CFC8B8] hover:border-[#C93A2B] hover:text-[#E05A47]"
                          >
                            <X className="h-3 w-3" />
                            <span>消去</span>
                          </button>
                        )}
                      </div>
                      {impromptuError && (
                        <p className="border border-[#5C3530] bg-[#241212] px-2.5 py-1.5 text-[11px] text-[#F08A7E]">
                          {impromptuError}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={impromptuLoading}
                    onClick={handleStartImpromptu}
                    className="inline-flex w-full items-center justify-center gap-2 border border-[#D4AF37] bg-[#261E0E] py-2.5 font-serif text-sm font-extrabold tracking-wider text-[#E3B94E] transition-colors hover:bg-[#3A2E14] disabled:opacity-50"
                  >
                    {impromptuLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>文章解析・デッキ構築中...</span>
                      </>
                    ) : (
                      <span>この文章で迷宮へ挑む</span>
                    )}
                  </button>
                </div>
              );
            })()}
          </div>
        </section>
      </div>
    );
  }

  // === ACTIVE RUN VIEW ===
  const relics = getRelicLabels(run.relicIds);
  const groupedRelics = Array.from(
    relics.reduce((map, r) => {
      const existing = map.get(r.id);
      if (existing) existing.count += 1;
      else map.set(r.id, { relic: r, count: 1 });
      return map;
    }, new Map<string, { relic: RelicDef; count: number }>()).values()
  );
  const selectedCard = run.hand.find((c) => c.instanceId === selectedCardId) ?? null;
  const intent = getEnemyCurrentIntent(run);
  const lastFmt = run.lastOutput ? formatJapaneseNumber(run.lastOutput.finalOutput) : null;
  const enemyHpPct = Math.max(0, Math.min(100, (run.enemyHp / run.enemy.maxHp) * 100));
  const playerHpPct = Math.max(0, Math.min(100, (run.playerHp / run.playerMaxHp) * 100));
  const hasOverclock = run.relicIds.includes("overclock");
  const isChokerCapped =
    run.relicIds.includes("black_pact_choker") && run.cardsPlayedThisTurn >= 6;
  const activeCombatFx =
    combatFx && (combatFx.floor === undefined || combatFx.floor === run.floor)
      ? combatFx
      : null;

  return (
    <div
      className={`grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,512px)_260px] lg:justify-center ${
        run.phase === "battle" ? "max-lg:h-full" : ""
      }`}
    >
      {/* PC Left Panel: Selected Card Details (pinned top) & Compact Scrollable Relics */}
      <aside className="hidden space-y-3 lg:block">
        <div className="border border-[#2E2822] bg-[#121016] p-3">
          <span className="block border-b border-[#2A241E] pb-1.5 font-mono text-[11px] font-bold text-[#8A7348]">
            選択中の語彙詳細
          </span>
          {selectedCard ? (
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-extrabold text-[#F2ECE0]">
                  {selectedCard.term}
                </span>
                <span className="font-mono text-[10px] text-[#968E7E]">
                  [{RANK_META[selectedCard.rank].kanji}]
                </span>
              </div>
              <p className="text-[11px] text-[#A89F8E]">
                属性：{ATTR_META[selectedCard.attribute].label}（
                {ATTR_META[selectedCard.attribute].roleHint}） ／ コスト：
                {getEffectiveCardCost(run, selectedCard)}
              </p>
              <p className="border-t border-[#2A241E] pt-1.5 text-[11px] leading-relaxed text-[#DCD4C2]">
                スキル：{selectedCard.skillDesc}
              </p>
              {(() => {
                const preview = getDynamicSkillPreview(run, selectedCard);
                return preview ? (
                  <p className="border border-[#5A4722] bg-[#1E170A] px-2 py-1 font-mono text-[10px] leading-snug text-[#F4D06F]">
                    {preview}
                  </p>
                ) : null;
              })()}
            </div>
          ) : (
            <p className="mt-2 text-[11px] leading-relaxed text-[#787166]">
              手札の語彙をクリックし、「こうげき / スキル / ぼうぎょ」を選択してください。先にスキルで倍率を上げると高出力が狙えます。
            </p>
          )}
        </div>

        <div className="border border-[#2E2822] bg-[#121016] p-3">
          <div className="mb-2 flex items-center justify-between border-b border-[#2A241E] pb-1.5">
            <span className="font-mono text-[11px] font-bold text-[#8A7348]">
              所持遺物 ({relics.length})
            </span>
            <span className="font-mono text-[10px] text-[#787166]">
              クリックで詳細
            </span>
          </div>
          {relics.length === 0 ? (
            <p className="text-[11px] text-[#787166]">
              まだ遺物を所持していません。敵を倒して獲得しよう。
            </p>
          ) : (
            <div className="grid max-h-[340px] grid-cols-1 gap-1.5 overflow-y-auto pr-1">
              {groupedRelics.map(({ relic: r, count }) => (
                <Tooltip key={r.id}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => setActiveRelicDetail(r)}
                        className={`flex w-full items-center justify-between gap-2 border px-2.5 py-1.5 text-left transition-colors ${
                          r.isWhiteRevelation
                            ? "border-[#D4AF37] bg-[#261E0E] hover:bg-[#352A14]"
                            : r.isBlackCovenant
                              ? "border-[#C93A2B] bg-[#241214] hover:bg-[#34181A]"
                              : r.isRepeatable
                                ? "border-[#5B9BD5] bg-[#101822] hover:bg-[#172332]"
                                : "border-[#2A241E] bg-[#0B0A0E] hover:border-[#8A7348]"
                        }`}
                      />
                    }
                  >
                    <span className="truncate font-serif text-xs font-bold text-[#E3B94E]">
                      {r.name}
                      {count > 1 && (
                        <span className="ml-1 font-mono text-[10px] text-[#69A3D9]">
                          ×{count}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 border border-[#3A332A] bg-[#141218] px-1.5 py-0.5 font-mono text-[9px] text-[#CFC8B8]">
                      {r.rankLabel}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-xs rounded-none border border-[#8A7348] bg-[#141218] p-2.5 text-xs text-[#ECE6D8]"
                  >
                    <div className="font-serif font-bold text-[#E3B94E]">
                      {r.name}
                      {count > 1 ? ` ×${count}` : ""}
                    </div>
                    <p className="mt-1 leading-relaxed text-[#DCD4C2]">
                      {r.description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Center Unified Stage (Compact single-screen fit on Mobile, full desktop panel on lg+) */}
      <section
        className={`mx-auto w-full min-w-0 max-w-[512px] lg:space-y-3 ${
          run.phase === "battle"
            ? "max-lg:flex max-lg:h-full max-lg:min-h-0 max-lg:flex-col max-lg:gap-1.5 max-lg:overflow-y-auto max-lg:overscroll-none max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            : "space-y-3"
        }`}
      >
        {/* Top Floor & Mobile Relic / Deck Strip */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 border border-[#2E2822] bg-[#121016] px-2.5 py-1.5 lg:gap-2 lg:px-3 lg:py-2">
          <div className="min-w-0">
            <span className="hidden truncate font-mono text-[10px] text-[#8A7348] lg:block">
              {run.stageName}
            </span>
            <div className="font-serif text-xs font-bold text-[#F2ECE0] lg:text-sm">
              第{run.floor}階{" "}
              {run.isEndless ? (
                <span className="text-[#C93A2B]">
                  （無間 {run.floor - run.totalStageFloors}層目）
                </span>
              ) : (
                <span className="font-mono text-[11px] text-[#968E7E] lg:text-xs">
                  / {run.totalStageFloors}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 lg:gap-1.5">
            <button
              type="button"
              onClick={() => {
                setDeckTab("all");
                setDeckModalOpen(true);
              }}
              className="inline-flex items-center gap-1 border border-[#3A332A] bg-[#0B0A0E] px-2 py-1 font-mono text-[10px] text-[#CFC8B8] hover:border-[#8A7348] hover:text-[#ECE6D8] lg:text-[11px]"
            >
              <Layers className="h-3 w-3 text-[#8A7348]" />
              <span>デッキ ({run.deck.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setRelicModalOpen(true)}
              className="border border-[#3A332A] bg-[#0B0A0E] px-2 py-1 font-mono text-[10px] text-[#E3B94E] lg:hidden"
            >
              遺物 ({relics.length})
            </button>
            <button
              type="button"
              onClick={() => setHudModalOpen(true)}
              className="border border-[#3A332A] bg-[#0B0A0E] px-2 py-1 font-mono text-[10px] text-[#CFC8B8] hover:border-[#8A7348] lg:hidden"
            >
              戦況・履歴
            </button>
            {run.phase !== "stage_clear" && run.phase !== "gameover" && (
              <button
                type="button"
                onClick={handleRetireRun}
                className="border border-[#3A332A] bg-[#0B0A0E] px-2 py-1 font-mono text-[10px] text-[#968E7E] hover:border-[#C93A2B] hover:text-[#E05A47]"
              >
                撤退
              </button>
            )}
          </div>
        </div>

        {/* Mobile Route Collapsible Bar (Always collapsed by default on mobile to preserve 1-screen layout) */}
        <div className="border border-[#2E2822] bg-[#100E14] px-2.5 py-1.5 lg:hidden">
          <button
            type="button"
            onClick={() => setRouteOpenMobile((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 text-left font-mono text-[10px] text-[#E3B94E]"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Compass className="h-3 w-3 shrink-0 text-[#8A7348]" />
              <span className="truncate">{getTransitionBannerText(run)}</span>
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-[#8A7348] transition-transform ${
                routeOpenMobile ? "rotate-180" : ""
              }`}
            />
          </button>
          {routeOpenMobile && (
            <div className="mt-1.5 flex items-center gap-1 overflow-x-auto border-t border-[#221D18] pt-1.5 pb-0.5">
              {buildDungeonRouteNodes(run).map((node, idx, arr) => {
                const isCurrent = node.status === "current";
                const isDone = node.status === "done";
                const baseChip =
                  node.kind === "library"
                    ? "border-[#2F7D5B] text-[#57B889]"
                    : node.kind === "covenant"
                      ? "border-[#8E352E] text-[#F08A7E]"
                      : node.kind === "boss"
                        ? "border-[#C93A2B] text-[#E3B94E]"
                        : "border-[#3A332A] text-[#CFC8B8]";
                return (
                  <div key={node.key} className="flex shrink-0 items-center gap-1">
                    <div
                      title={node.title}
                      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] transition-all ${
                        isCurrent
                          ? "border-[#D4AF37] bg-[#261E0E] font-bold text-[#F4D06F]"
                          : isDone
                            ? "border-[#2A241E] bg-[#0B0A0E] text-[#6B6458] line-through"
                            : `bg-[#141118] ${baseChip}`
                      }`}
                    >
                      {node.kind === "boss" && <Skull className="h-2.5 w-2.5" />}
                      {node.kind === "library" && (
                        <BookMarked className="h-2.5 w-2.5" />
                      )}
                      <span>{node.label}</span>
                    </div>
                    {idx < arr.length - 1 && (
                      <ChevronRight className="h-3 w-3 shrink-0 text-[#4A4338]" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PC Progression Stepper & Transition Banner */}
        <div className="hidden border border-[#2E2822] bg-[#100E14] px-2.5 py-2 space-y-2 lg:block">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {buildDungeonRouteNodes(run).map((node, idx, arr) => {
              const isCurrent = node.status === "current";
              const isDone = node.status === "done";
              const baseChip =
                node.kind === "library"
                  ? "border-[#2F7D5B] text-[#57B889]"
                  : node.kind === "covenant"
                    ? "border-[#8E352E] text-[#F08A7E]"
                    : node.kind === "boss"
                      ? "border-[#C93A2B] text-[#E3B94E]"
                      : "border-[#3A332A] text-[#CFC8B8]";
              return (
                <div key={node.key} className="flex shrink-0 items-center gap-1">
                  <div
                    title={node.title}
                    className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] transition-all ${
                      isCurrent
                        ? "border-[#D4AF37] bg-[#261E0E] font-bold text-[#F4D06F] shadow-[0_0_8px_rgba(212,175,55,0.28)]"
                        : isDone
                          ? "border-[#2A241E] bg-[#0B0A0E] text-[#6B6458] line-through"
                          : `bg-[#141118] ${baseChip}`
                    }`}
                  >
                    {node.kind === "boss" && <Skull className="h-2.5 w-2.5" />}
                    {node.kind === "library" && (
                      <BookMarked className="h-2.5 w-2.5" />
                    )}
                    <span>{node.label}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <ChevronRight className="h-3 w-3 shrink-0 text-[#4A4338]" />
                  )}
                </div>
              );
            })}
          </div>

          <motion.div
            key={`${run.floor}_${run.phase}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-1.5 border-t border-[#221D18] pt-1.5 font-mono text-[11px] text-[#E3B94E]"
          >
            <Compass className="h-3.5 w-3.5 shrink-0 text-[#8A7348]" />
            <span className="truncate">{getTransitionBannerText(run)}</span>
          </motion.div>
        </div>

        {/* === BATTLE PHASE === */}
        {run.phase === "battle" && (
          <>
            <div className="space-y-1.5 lg:space-y-3">
              {/* Mobile Compact Enemy Stage (Fits 1 screen without vertical scroll) */}
              <motion.div
                onClick={pendingVictoryRun ? flushPendingVictory : undefined}
                animate={
                  activeCombatFx &&
                  (activeCombatFx.kind === "attack" || activeCombatFx.kind === "pierce") &&
                  (activeCombatFx.shakeLevel >= 2 || activeCombatFx.isLethal)
                    ? { x: [0, -4, 4, -2, 2, 0], y: [0, 2, -2, 0] }
                    : { x: 0, y: 0 }
                }
                transition={{ duration: 0.32 }}
                className={`kaku-frame stage-grid flex flex-col gap-1.5 p-2.5 lg:hidden ${
                  pendingVictoryRun ? "cursor-pointer" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="inline-flex items-center gap-1 border border-[#5C3530] bg-[#241212] px-1.5 py-0.5 font-mono text-[10px] text-[#E05A47]">
                    <AlertOctagon className="h-3 w-3 shrink-0" />
                    <span>次：{intent.label}</span>
                  </div>
                  <span
                    style={{ color: ATTR_META[run.enemy.attribute].color }}
                    className="font-mono text-[10px]"
                  >
                    [{ATTR_META[run.enemy.attribute].label}] {run.enemy.title}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <AnimatedEnemySprite
                      spriteId={run.enemy.spriteId}
                      attribute={run.enemy.attribute}
                      size={60}
                      isBoss={run.enemy.isBoss}
                      effect={activeCombatFx}
                      compact
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="truncate font-serif text-base font-extrabold text-[#F2ECE0]">
                      {run.enemy.name}
                    </h2>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#E05A47]">
                        HP {formatJapaneseNumber(run.enemyHp).text} /{" "}
                        {formatJapaneseNumber(run.enemy.maxHp).text}
                      </span>
                      {run.enemyShield > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[#5B9BD5]">
                          <Shield className="h-3 w-3" />
                          {formatJapaneseNumber(run.enemyShield).text}
                        </span>
                      )}
                    </div>
                    <div className="h-2 w-full border border-[#3A332A] bg-[#0B0A0E]">
                      <div
                        style={{ width: `${enemyHpPct}%` }}
                        className="h-full bg-[#C93A2B] transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                {run.enemy.gimmickDesc && (
                  <div className="border border-[#8A7348]/50 bg-[#1B1610] px-2 py-0.5 font-mono text-[9.5px] leading-snug text-[#E3B94E]">
                    特性：{run.enemy.gimmickDesc}
                  </div>
                )}

                {/* Fixed-height output line on mobile so layout never jumps on attack/guard */}
                <div className="flex h-[26px] items-center justify-center border border-[#2E2822] bg-[#0B0A0E]/90 px-2">
                  <AnimatePresence mode="wait">
                    {run.lastOutput && lastFmt ? (
                      <motion.div
                        key={`mob_out_${run.cardsPlayedThisTurn}_${run.lastOutput.cardTerm}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex w-full items-center justify-between gap-2 font-mono text-[11px]"
                      >
                        <span className="truncate text-[#968E7E]">
                          {run.lastOutput.cardTerm}（
                          {run.lastOutput.role === "attack"
                            ? "攻"
                            : run.lastOutput.role === "guard"
                              ? "防"
                              : "技"}
                          {run.lastOutput.retriggers > 1
                            ? `×${run.lastOutput.retriggers}連`
                            : ""}
                          ）
                        </span>
                        <span className={`shrink-0 font-pixel text-sm font-bold ${lastFmt.colorClass}`}>
                          {run.lastOutput.role === "guard" || run.lastOutput.didShield
                            ? `盾 +${lastFmt.text}`
                            : run.lastOutput.role === "attack" || run.lastOutput.didDamage
                              ? `${lastFmt.text} DMG`
                              : `倍率 ×${formatJapaneseNumber(run.battleMult).text}`}
                        </span>
                      </motion.div>
                    ) : (
                      <span className="font-mono text-[10px] text-[#6B6458]">
                        手札の語彙を選択して行動してください
                      </span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* PC Enemy Stage (Unchanged desktop layout) */}
              <motion.div
                onClick={pendingVictoryRun ? flushPendingVictory : undefined}
                animate={
                  activeCombatFx &&
                  (activeCombatFx.kind === "attack" || activeCombatFx.kind === "pierce") &&
                  (activeCombatFx.shakeLevel >= 2 || activeCombatFx.isLethal)
                    ? { x: [0, -5, 5, -3, 3, 0], y: [0, 2, -2, 0] }
                    : { x: 0, y: 0 }
                }
                transition={{ duration: 0.34 }}
                className={`kaku-frame stage-grid hidden flex-col items-center p-4 lg:flex ${
                  pendingVictoryRun ? "cursor-pointer" : ""
                }`}
              >
                {/* Enemy Next Intent */}
                <div className="mb-2 flex items-center gap-2 border border-[#5C3530] bg-[#241212] px-3 py-1 font-mono text-xs text-[#E05A47]">
                  <AlertOctagon className="h-3.5 w-3.5 shrink-0" />
                  <span>次ターン予告：{intent.label}</span>
                </div>

                {/* Pixel Sprite */}
                <div className="my-2">
                  <AnimatedEnemySprite
                    spriteId={run.enemy.spriteId}
                    attribute={run.enemy.attribute}
                    size={104}
                    isBoss={run.enemy.isBoss}
                    effect={activeCombatFx}
                  />
                </div>

                <div className="text-center">
                  <span
                    style={{ color: ATTR_META[run.enemy.attribute].color }}
                    className="font-mono text-[10px]"
                  >
                    [{ATTR_META[run.enemy.attribute].label}] {run.enemy.title}
                  </span>
                  <h2 className="font-serif text-lg font-extrabold text-[#F2ECE0]">
                    {run.enemy.name}
                  </h2>
                  {run.enemy.gimmickDesc && (
                    <div className="mt-1.5 border border-[#8A7348]/60 bg-[#1B1610] px-2.5 py-1 font-mono text-[10px] leading-snug text-[#E3B94E]">
                      特性：{run.enemy.gimmickDesc}
                    </div>
                  )}
                </div>

                {/* Enemy HP & Shield */}
                <div className="mt-2 w-full max-w-xs space-y-1">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-[#E05A47]">
                      HP {formatJapaneseNumber(run.enemyHp).text} /{" "}
                      {formatJapaneseNumber(run.enemy.maxHp).text}
                    </span>
                    {run.enemyShield > 0 && (
                      <span className="inline-flex items-center gap-1 text-[#5B9BD5]">
                        <Shield className="h-3 w-3" />
                        {formatJapaneseNumber(run.enemyShield).text}
                      </span>
                    )}
                  </div>
                  <div className="h-2.5 w-full border border-[#3A332A] bg-[#0B0A0E]">
                    <div
                      style={{ width: `${enemyHpPct}%` }}
                      className="h-full bg-[#C93A2B] transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Big-Number Output Calculation Pop */}
                <AnimatePresence mode="wait">
                  {run.lastOutput && lastFmt && (
                    <motion.div
                      key={`${run.cardsPlayedThisTurn}_${run.lastOutput.cardTerm}`}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 w-full border border-[#3A332A] bg-[#0B0A0E]/90 px-3 py-2 text-center"
                    >
                      <div className="font-mono text-[10px] text-[#968E7E]">
                        {run.lastOutput.cardTerm}（
                        {run.lastOutput.role === "attack"
                          ? "こうげき"
                          : run.lastOutput.role === "guard"
                            ? "ぼうぎょ"
                            : "スキル"}
                        ）： 基礎{run.lastOutput.baseOutput} × 倍率
                        {formatJapaneseNumber(run.lastOutput.multiplier).text}
                        {run.lastOutput.retriggers > 1
                          ? ` ／ ${run.lastOutput.retriggers}連発動`
                          : ""}
                      </div>
                      <div
                        className={`font-pixel text-2xl font-bold tracking-wider ${lastFmt.colorClass}`}
                      >
                        {run.lastOutput.role === "guard" || run.lastOutput.didShield
                          ? `盾 +${lastFmt.text}`
                          : run.lastOutput.role === "attack" || run.lastOutput.didDamage
                            ? `${lastFmt.text} DMG`
                            : `倍率 ×${formatJapaneseNumber(run.battleMult).text}`}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Player Status Strip */}
              <div className="relative grid grid-cols-3 gap-2 border border-[#2E2822] bg-[#121016] p-2 font-mono text-xs lg:p-2.5">
                <PlayerStripOverlay effect={activeCombatFx} />
                <div>
                  <span className="flex items-center gap-1 text-[10px] text-[#968E7E]">
                    <Heart className="h-3 w-3 text-[#C93A2B]" />
                    体力
                  </span>
                  <span className="font-bold text-[#ECE6D8]">
                    {run.playerHp} / {run.playerMaxHp}
                  </span>
                  <div className="mt-1 h-1.5 w-full bg-[#0B0A0E]">
                    <div
                      style={{ width: `${playerHpPct}%` }}
                      className="h-full bg-[#2F7D5B]"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#968E7E]">
                    <Shield className="h-3 w-3 text-[#5B9BD5]" />
                    シールド
                  </span>
                  <div className="text-sm font-bold text-[#5B9BD5] lg:text-base">
                    {formatJapaneseNumber(run.playerShield).text}
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#968E7E]">
                    <Zap className="h-3 w-3 text-[#E3B94E]" />
                    コスト
                  </span>
                  <div className="text-sm font-bold text-[#E3B94E] lg:text-base">
                    {run.energy} / {run.maxEnergy}
                  </div>
                </div>
              </div>

              {/* Mobile Live Multiplier Summary Strip */}
              <button
                type="button"
                onClick={() => setHudModalOpen(true)}
                className="flex w-full items-center justify-between gap-2 border border-[#2A241E] bg-[#100E14] px-2.5 py-1 text-left font-mono text-[10px] lg:hidden"
              >
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap">
                  <span className="text-[#968E7E]">
                    乗算 <strong className="text-[#E3B94E]">×{formatJapaneseNumber(run.battleMult).text}</strong>
                  </span>
                  <span className="text-[#968E7E]">
                    次札 <strong className="text-[#57B889]">×{run.nextCardMult.toFixed(2)}</strong>
                  </span>
                  <span className="text-[#968E7E]">
                    永続 <strong className="text-[#69A3D9]">×{formatJapaneseNumber(run.tengenPermanentMult * run.permanentMultBonus).text}</strong>
                  </span>
                  <span className="text-[#968E7E]">
                    永続基礎 <strong className="text-[#9BD1B5]">+{formatJapaneseNumber(run.permanentFlatAdd).text}</strong>
                  </span>
                </div>
                <span className="shrink-0 text-[10px] text-[#8A7348]">詳細 ›</span>
              </button>

              {(run.cardsPlayedThisTurn >= 1 ||
                run.highRankCostDiscountThisTurn > 0 ||
                run.englishCostDiscountThisTurn > 0 ||
                run.nextCardCostDiscountThisTurn > 0 ||
                run.nextCardRetrigger > 0 ||
                run.nextAttackMult > 1 ||
                run.nextAttackFlatAdd > 0 ||
                run.nextFInverted ||
                run.pendingSelfHarmPctAfterAttack > 0 ||
                run.selfHarmCountInBattle > 0 ||
                run.penNibReady ||
                run.relicIds.includes("black_pact_choker")) && (
                <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5 font-mono text-[10px] lg:flex-wrap lg:overflow-visible lg:whitespace-normal">
                  {run.relicIds.includes("black_pact_choker") && (
                    <span className="shrink-0 border border-[#C93A2B] bg-[#261314] px-2 py-0.5 font-bold text-[#F08A7E]">
                      拘束の首輪：{run.cardsPlayedThisTurn}/6枚
                    </span>
                  )}
                  {run.penNibReady && (
                    <span className="shrink-0 border border-[#D4AF37] bg-[#261E0E] px-2 py-0.5 font-bold text-[#F4D06F]">
                      万年筆待機：次攻撃 ×2.5＋再発動+1
                    </span>
                  )}
                  {run.cardsPlayedThisTurn >= 1 && (
                    <span className="shrink-0 border border-[#2E2822] bg-[#121016] px-2 py-0.5 text-[#CFC8B8]">
                      このターン発動：{run.cardsPlayedThisTurn}枚目
                      {run.cardsPlayedThisTurn >= 2
                        ? `（連鎖補正 ×${(1 + (run.cardsPlayedThisTurn - 1) * 0.2).toFixed(1)}）`
                        : ""}
                    </span>
                  )}
                  {run.nextCardRetrigger > 0 && (
                    <span className="shrink-0 border border-[#D4AF37] bg-[#261E0E] px-2 py-0.5 font-bold text-[#F4D06F]">
                      次カード 計{Math.min(12, run.nextCardRetrigger + 1)}回発動
                    </span>
                  )}
                  {run.nextAttackMult > 1 && (
                    <span className="shrink-0 border border-[#C93A2B] bg-[#261314] px-2 py-0.5 font-bold text-[#F08A7E]">
                      次攻撃 ×{formatJapaneseNumber(run.nextAttackMult).text}
                    </span>
                  )}
                  {run.nextAttackFlatAdd > 0 && (
                    <span className="shrink-0 border border-[#D96B43] bg-[#261710] px-2 py-0.5 text-[#F4A261]">
                      次攻撃基礎 +{run.nextAttackFlatAdd}
                    </span>
                  )}
                  {run.nextFInverted && (
                    <span className="shrink-0 border border-[#C8A464] bg-[#261E0E] px-2 py-0.5 text-[#F4D06F]">
                      次の『不』反転×{run.nextFInvertMult}
                    </span>
                  )}
                  {run.pendingSelfHarmPctAfterAttack > 0 && (
                    <span className="shrink-0 border border-[#D44D4D] bg-[#261014] px-2 py-0.5 text-[#F08A7E]">
                      攻撃後HP-{run.pendingSelfHarmPctAfterAttack}%
                    </span>
                  )}
                  {run.selfHarmCountInBattle > 0 && (
                    <span className="shrink-0 border border-[#5C3530] bg-[#180E10] px-2 py-0.5 text-[#C9A098]">
                      自傷 {run.selfHarmCountInBattle}回 / 累計-{run.selfHarmHpTotalInBattle}HP
                    </span>
                  )}
                  {run.englishCostDiscountThisTurn > 0 && (
                    <span className="shrink-0 border border-[#9B7EDE] bg-[#1E172E] px-2 py-0.5 text-[#C5B3F2]">
                      今ターン英語コスト -{run.englishCostDiscountThisTurn}
                    </span>
                  )}
                  {run.nextCardCostDiscountThisTurn > 0 && (
                    <span className="shrink-0 border border-[#4FA8D6] bg-[#101C26] px-2 py-0.5 text-[#89CFF0]">
                      次の1枚コスト -{run.nextCardCostDiscountThisTurn}
                    </span>
                  )}
                  {run.highRankCostDiscountThisTurn > 0 && (
                    <span className="shrink-0 border border-[#8A7348] bg-[#261E0E] px-2 py-0.5 text-[#E3B94E]">
                      次の秀/極/異コスト -{run.highRankCostDiscountThisTurn}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Controls Group (Flows naturally below enemy/status without blank gap) */}
            <div className="shrink-0 space-y-1.5 lg:space-y-3">
              {/* Mobile Fixed-Height Card Detail Slot (Above commands so buttons & hand never jump vertically) */}
              <div className="flex h-[52px] flex-col justify-center overflow-hidden border border-[#3A332A] bg-[#17141D] px-2.5 py-1 text-[11px] text-[#DCD4C2] lg:hidden">
                {selectedCard ? (() => {
                  const selStats = getEffectiveStats(selectedCard, selectedCard.plusLevel);
                  const selAttr = ATTR_META[selectedCard.attribute];
                  const selCost = getEffectiveCardCost(run, selectedCard);
                  const preview = getDynamicSkillPreview(run, selectedCard);
                  return (
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-1.5 font-mono text-[10px]">
                        <div className="flex min-w-0 items-center gap-1">
                          <strong className="truncate font-serif text-xs text-[#E3B94E]">
                            {selectedCard.term}
                          </strong>
                          {selectedCard.plusLevel > 0 && (
                            <span className="shrink-0 text-[#E3B94E]">
                              +{selectedCard.plusLevel}
                            </span>
                          )}
                          <span style={{ color: selAttr.color }} className="shrink-0">
                            [{selAttr.label}]
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[#ECE6D8]">{selCost}コス</span>
                          <span className="text-[#F07167]">攻{selStats.atk}</span>
                          <span className="text-[#69A3D9]">防{selStats.def}</span>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-[10px] leading-snug text-[#CFC8B8]">
                        {preview ?? selectedCard.skillDesc}
                      </p>
                    </div>
                  );
                })() : (
                  <p className="text-center font-mono text-[10px] text-[#787166]">
                    下のカードをタップ →「こうげき / スキル / ぼうぎょ」で発動
                  </p>
                )}
              </div>

              {/* 3 Command Buttons */}
              <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
                {(
                  [
                    {
                      role: "attack" as CommandRole,
                      label: "こうげき",
                      icon: Sword,
                      accent: "border-[#B8332A] bg-[#261314] text-[#F2ECE0] hover:bg-[#C93A2B]",
                    },
                    {
                      role: "skill" as CommandRole,
                      label: "スキル",
                      icon: Sparkles,
                      accent: "border-[#B0872D] bg-[#261E0E] text-[#E3B94E] hover:bg-[#3A2D12]",
                    },
                    {
                      role: "guard" as CommandRole,
                      label: "ぼうぎょ",
                      icon: Shield,
                      accent: "border-[#2E5C8A] bg-[#131D28] text-[#69A3D9] hover:bg-[#1E3145]",
                    },
                  ] as const
                ).map((cmd) => {
                  const Icon = cmd.icon;
                  const cost = selectedCard ? getEffectiveCardCost(run, selectedCard) : 0;
                  const guardLocked =
                    cmd.role === "guard" && run.relicIds.includes("black_pact_solo");
                  const affordable =
                    !pendingVictoryRun &&
                    !guardLocked &&
                    !isChokerCapped &&
                    Boolean(selectedCard) &&
                    (run.energy >= cost || hasOverclock);
                  const bonusTag =
                    selectedCard && cmd.role === "attack"
                      ? selectedCard.attribute === "emotion" || selectedCard.attribute === "sense"
                        ? "×1.25"
                        : selectedCard.attribute === "logic" &&
                            (selectedCard.rank === "SSR" || selectedCard.rank === "UR")
                          ? "貫通"
                          : null
                      : selectedCard &&
                          cmd.role === "guard" &&
                          (selectedCard.attribute === "logic" || selectedCard.attribute === "matter")
                        ? "×1.25"
                        : null;
                  return (
                    <button
                      key={cmd.role}
                      type="button"
                      disabled={!affordable}
                      onClick={() => handlePlayCommand(cmd.role)}
                      className={`flex items-center justify-center gap-1 border py-2 font-serif text-xs font-extrabold tracking-wider transition-colors lg:gap-1.5 lg:py-2.5 lg:text-sm ${
                        affordable
                          ? cmd.accent
                          : "cursor-not-allowed border-[#2A241E] bg-[#121016] text-[#5C564C]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{guardLocked ? `${cmd.label} (封)` : cmd.label}</span>
                      {bonusTag && affordable && (
                        <span className="border border-current/40 bg-[#0B0A0E]/60 px-1 py-0.5 font-mono text-[9px] lg:text-[10px]">
                          {bonusTag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Hand Cards: Fits 1–5 cards cleanly without horizontal clipping; 6+ cards scroll smoothly */}
              {(() => {
                const isScrollable = run.hand.length >= 6;
                const cardWrapperClass = isScrollable
                  ? "relative shrink-0"
                  : run.hand.length === 5
                    ? "relative min-w-0 flex-1 max-w-[78px]"
                    : "relative min-w-0 flex-1 max-w-[84px]";
                const cardClass = isScrollable
                  ? "w-[74px] min-h-[104px]"
                  : "w-full min-h-[104px]";
                const rail = (
                  <div
                    className={
                      isScrollable
                        ? "flex w-max min-w-full items-end justify-start gap-1 px-1 pt-4 pb-1"
                        : "flex w-full items-end justify-center gap-1 pt-4 pb-1"
                    }
                  >
                    {run.hand.map((card, idx) => {
                      const cost = getEffectiveCardCost(run, card);
                      const canAfford = !isChokerCapped && (run.energy >= cost || hasOverclock);
                      const isSelected = selectedCardId === card.instanceId;
                      return (
                        <motion.div
                          key={card.instanceId}
                          layout
                          animate={
                            isSelected
                              ? { y: -8, scale: 1.04 }
                              : { y: 0, scale: 1 }
                          }
                          transition={{ type: "spring", stiffness: 420, damping: 28 }}
                          style={{ zIndex: isSelected ? 20 : idx + 1 }}
                          className={cardWrapperClass}
                        >
                          <WordCard
                            word={card}
                            effectiveCost={cost}
                            plusLevel={card.plusLevel}
                            selected={isSelected}
                            disabled={!canAfford}
                            isTemporaryTrial={card.isTemporaryTrial}
                            compact
                            mini
                            disableLift
                            className={cardClass}
                            onClick={() =>
                              setSelectedCardId((prev) =>
                                prev === card.instanceId ? null : card.instanceId
                              )
                            }
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                );
                return isScrollable ? (
                  <div className="touch-pan-x overflow-x-auto overscroll-x-contain lg:hidden">
                    {rail}
                  </div>
                ) : (
                  <div className="lg:hidden">{rail}</div>
                );
              })()}

              {/* PC Hand Cards (Original 5-column desktop grid preserved) */}
              <div className="hidden gap-2 lg:grid lg:grid-cols-5">
                {run.hand.map((card) => {
                  const cost = getEffectiveCardCost(run, card);
                  const canAfford = !isChokerCapped && (run.energy >= cost || hasOverclock);
                  return (
                    <WordCard
                      key={card.instanceId}
                      word={card}
                      effectiveCost={cost}
                      plusLevel={card.plusLevel}
                      selected={selectedCardId === card.instanceId}
                      disabled={!canAfford}
                      isTemporaryTrial={card.isTemporaryTrial}
                      compact
                      onClick={() =>
                        setSelectedCardId((prev) =>
                          prev === card.instanceId ? null : card.instanceId
                        )
                      }
                    />
                  );
                })}
              </div>

              {/* Deck Counts (Clickable!) & Turn End */}
              <div className="flex items-center justify-between pt-0.5 lg:pt-1">
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setDeckTab("draw");
                      setDeckModalOpen(true);
                    }}
                    className="border border-[#2E2822] bg-[#121016] px-2.5 py-1.5 text-[#CFC8B8] hover:border-[#8A7348] hover:text-[#E3B94E] lg:px-2 lg:py-1"
                  >
                    山札 {run.drawPile.length}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeckTab("discard");
                      setDeckModalOpen(true);
                    }}
                    className="border border-[#2E2822] bg-[#121016] px-2.5 py-1.5 text-[#A89F8E] hover:border-[#8A7348] hover:text-[#E3B94E] lg:px-2 lg:py-1"
                  >
                    捨札 {run.discardPile.length + run.playedThisTurn.length}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={Boolean(pendingVictoryRun)}
                  onClick={handleEndTurn}
                  className="border border-[#8A7348] bg-[#1A1620] px-5 py-2 font-serif text-xs font-bold tracking-wider text-[#ECE6D8] hover:border-[#D4AF37] hover:bg-[#272130] disabled:opacity-50"
                >
                  ターン終了
                </button>
              </div>
            </div>
          </>
        )}

        {/* === REWARD: CARD 3-CHOICE === */}
        {run.phase === "reward_card" && (() => {
          const selectedReward =
            run.cardChoices.find((c) => c.instanceId === selectedRewardCardId) ?? null;
          return (
            <div className="kaku-frame space-y-3 p-3 sm:space-y-4 sm:p-5">
              <div>
                <p className="font-mono text-[10px] text-[#8A7348]">VICTORY REWARD</p>
                <h2 className="font-serif text-lg font-extrabold text-[#F2ECE0] sm:text-xl">
                  語彙カードを1枚デッキに加える
                </h2>
                <p className="mt-0.5 text-[11px] text-[#A89F8E] sm:mt-1 sm:text-xs">
                  {run.runMode === "random"
                    ? "全語彙プールからのランダム抽選（未所持カードは今回限りのお試し）。"
                    : run.runMode === "impromptu"
                      ? "入力した文章から生まれた語彙（＋強化コピー／今回限りのお試し）が出現。"
                      : "マイ辞書からの抽選＋時折「お試し」高レアカードが出現します。"}
                </p>
              </div>

              {/* Mobile: Slay-the-Spire style 3-card animated rail + fixed detail slot */}
              <div className="space-y-2.5 lg:hidden">
                <div className="flex items-end justify-center gap-2 px-1 pt-4 pb-1">
                  {run.cardChoices.map((c, idx) => {
                    const isSelected = selectedReward?.instanceId === c.instanceId;
                    return (
                      <motion.div
                        key={c.instanceId}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={
                          isSelected
                            ? { opacity: 1, y: -10, scale: 1.05 }
                            : { opacity: 1, y: 0, scale: 1 }
                        }
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 28,
                          opacity: { duration: 0.2, delay: idx * 0.05 },
                        }}
                        style={{ zIndex: isSelected ? 20 : idx + 1 }}
                        className="relative shrink-0"
                      >
                        <WordCard
                          word={c}
                          plusLevel={c.plusLevel}
                          selected={isSelected}
                          isTemporaryTrial={c.isTemporaryTrial}
                          compact
                          disableLift
                          className="w-[98px] min-h-[112px]"
                          onClick={() =>
                            setSelectedRewardCardId((prev) =>
                              prev === c.instanceId ? null : c.instanceId
                            )
                          }
                        />
                      </motion.div>
                    );
                  })}
                </div>

                {/* Fixed-height Detail Preview Box */}
                <div className="flex min-h-[82px] flex-col justify-center border border-[#3A332A] bg-[#17141D] px-3 py-2 text-xs text-[#DCD4C2]">
                  {selectedReward ? (() => {
                    const rStats = getEffectiveStats(selectedReward, selectedReward.plusLevel);
                    const rAttr = ATTR_META[selectedReward.attribute];
                    const rRank = RANK_META[selectedReward.rank];
                    const rSkill = SKILL_META[selectedReward.skillType];
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              style={{ color: rRank.color }}
                              className="shrink-0 font-serif font-bold"
                            >
                              [{rRank.kanji}]
                            </span>
                            <strong className="truncate font-serif text-sm text-[#F4D06F]">
                              {selectedReward.term}
                            </strong>
                            <span className="truncate text-[#8E8678]">
                              ({selectedReward.reading})
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[#ECE6D8]">{selectedReward.cost}コス</span>
                            <span className="text-[#F07167]">攻{rStats.atk}</span>
                            <span className="text-[#69A3D9]">防{rStats.def}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span style={{ color: rAttr.color }} className="font-bold">
                            {rAttr.label} [{rAttr.roleHint}]
                          </span>
                          <span
                            style={{ color: rSkill.color }}
                            className="border border-[#2E2822] bg-[#0B0A0E] px-1.5 py-0.5 font-mono font-bold"
                          >
                            {rSkill.shortTag}
                          </span>
                        </div>
                        <p className="text-[11px] leading-snug text-[#CFC8B8]">
                          {selectedReward.skillDesc}
                        </p>
                      </div>
                    );
                  })() : (
                    <p className="text-center font-mono text-[11px] text-[#787166]">
                      上のカードをタップして能力を比較・選択してください
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!selectedReward}
                  onClick={() => {
                    if (!selectedReward) return;
                    setRun(chooseCardReward(run, selectedReward));
                    setSelectedRewardCardId(null);
                  }}
                  className={`w-full border py-2.5 font-serif text-sm font-extrabold tracking-wider transition-colors ${
                    selectedReward
                      ? "border-[#D4AF37] bg-[#261E0E] text-[#F4D06F] hover:bg-[#352A14]"
                      : "cursor-not-allowed border-[#2A241E] bg-[#121016] text-[#5C564C]"
                  }`}
                >
                  {selectedReward
                    ? `『${selectedReward.term}』をデッキに加える`
                    : "カードを選択してください"}
                </button>
              </div>

              {/* PC: Original 3-column full cards */}
              <div className="hidden gap-2.5 lg:grid lg:grid-cols-3">
                {run.cardChoices.map((c) => (
                  <WordCard
                    key={c.instanceId}
                    word={c}
                    plusLevel={c.plusLevel}
                    isTemporaryTrial={c.isTemporaryTrial}
                    onClick={() => {
                      setRun(chooseCardReward(run, c));
                      setSelectedRewardCardId(null);
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setRun(chooseCardReward(run, null));
                  setSelectedRewardCardId(null);
                }}
                className="w-full border border-[#3A332A] bg-[#0B0A0E] py-2 font-mono text-[11px] text-[#968E7E] hover:text-[#ECE6D8] sm:text-xs"
              >
                {run.relicIds.includes("black_pact_ascetic")
                  ? `見送る（禁欲の代償：永続乗算 ×1.45 ＆ 最大HP +10%${run.relicIds.includes("singing_chalice") ? " ＋ 聖杯：最大HP+10%＆×1.22" : ""}）`
                  : `見送る（デッキを薄く保ち HP+${run.relicIds.includes("blood_meat_relic") ? 9 : 6} 回復${run.relicIds.includes("singing_chalice") ? " ＋ 聖杯：最大HP+10%＆×1.22" : ""}）`}
              </button>
            </div>
          );
        })()}

        {/* === REWARD: RELIC 3-CHOICE === */}
        {run.phase === "reward_relic" && (
          <div className="kaku-frame space-y-2.5 p-3 lg:space-y-4 lg:p-5">
            <div>
              <p className="hidden font-mono text-[10px] text-[#E3B94E] lg:block">
                {run.isEndless ? "ENDLESS BOSS RELIC" : "RELIC SELECTION"}
              </p>
              <h2 className="font-serif text-lg font-extrabold text-[#F2ECE0] lg:text-xl">
                {run.isEndless
                  ? "無間の主 撃破報酬：遺物（レリック）を1つ選択"
                  : "遺物（レリック）を1つ選択"}
              </h2>
            </div>
            <div className="space-y-2 lg:space-y-2.5">
              {run.relicChoices.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRun(chooseRelicReward(run, r))}
                  className="w-full border border-[#8A7348] bg-[#16131C] p-2.5 text-left transition-colors hover:border-[#D4AF37] hover:bg-[#211C2A] lg:p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-sm font-extrabold text-[#E3B94E] lg:text-base">
                      {r.name}
                    </span>
                    <span className="shrink-0 border border-[#564935] bg-[#0B0A0E] px-2 py-0.5 font-mono text-[10px] text-[#CFC8B8]">
                      {r.rankLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-[#DCD4C2] lg:text-xs lg:leading-relaxed">
                    {r.description}
                  </p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRun(chooseRelicReward(run, null))}
              className="w-full border border-[#3A332A] bg-[#0B0A0E] py-2 font-mono text-[11px] text-[#968E7E] hover:border-[#8A7348] hover:text-[#ECE6D8] lg:text-xs"
            >
              {run.relicIds.includes("black_pact_ascetic")
                ? "受け取らずに見送る（禁欲の代償により回復無効）"
                : `受け取らずに見送る（HP+${run.relicIds.includes("blood_meat_relic") ? 12 : 8} 回復）`}
            </button>
          </div>
        )}

        {/* === EVENT: BLACK COVENANT vs WHITE REVELATION === */}
        {run.phase === "event_covenant" &&
          (run.covenantOfferedBlack || run.covenantOfferedWhite || run.covenantOfferedRelic) &&
          (() => {
            const offeredBlack =
              run.covenantOfferedBlack ??
              (run.covenantOfferedRelic && !run.covenantIsWhite
                ? run.covenantOfferedRelic
                : null);
            const offeredWhite =
              run.covenantOfferedWhite ??
              (run.covenantOfferedRelic && run.covenantIsWhite
                ? run.covenantOfferedRelic
                : null);
            return (
              <div className="kaku-frame space-y-2.5 border border-[#8A7348] bg-[#120F16] p-3 lg:space-y-4 lg:p-5">
                <div>
                  <p className="hidden font-mono text-[10px] tracking-widest text-[#E3B94E] lg:block">
                    {offeredBlack && offeredWhite
                      ? "ALTAR OF COVENANT & REVELATION"
                      : offeredWhite
                        ? "WHITE REVELATION ALTAR"
                        : "BLACK COVENANT ALTAR"}
                  </p>
                  <h2 className="font-serif text-lg font-extrabold text-[#F2ECE0] lg:mt-1 lg:text-xl">
                    {offeredBlack && offeredWhite
                      ? "運命の祭壇 — 黒か白か"
                      : offeredWhite
                        ? "白き天啓の祭壇"
                        : "黒き契約の祭壇"}
                  </h2>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#CFC8B8] lg:mt-1 lg:text-xs">
                    {offeredBlack && offeredWhite
                      ? "選んだ側の祭壇のみ以降出現します（見送り可）。"
                      : offeredWhite
                        ? "白き天啓のみ出現中です。"
                        : "黒き契約のみ出現中です。"}
                  </p>
                </div>

                <div
                  className={`grid gap-2.5 lg:gap-3 ${
                    offeredBlack && offeredWhite
                      ? "grid-cols-1 sm:grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {offeredBlack && (
                    <div className="flex flex-col justify-between space-y-2 border border-[#C93A2B] bg-[#1A0E10] p-2.5 lg:space-y-3 lg:p-3.5">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif text-sm font-bold text-[#F7B5AD] lg:hidden">
                            {offeredBlack.name}
                          </span>
                          <span className="hidden font-mono text-[10px] tracking-widest text-[#F08A7E] lg:inline">
                            BLACK COVENANT
                          </span>
                          <span className="shrink-0 border border-[#8E352E] bg-[#0B0A0E] px-1.5 py-0.5 font-mono text-[10px] text-[#F08A7E]">
                            黒契約・代償付火力
                          </span>
                        </div>
                        <div className="mt-1 hidden font-serif text-base font-bold text-[#F7B5AD] lg:block">
                          {offeredBlack.name}
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-[#ECE6D8] lg:text-xs lg:leading-relaxed">
                          {offeredBlack.description}
                        </p>
                        <p className="mt-1.5 hidden text-[11px] italic text-[#9C8481] lg:block">
                          {offeredBlack.flavor}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRun(resolveCovenantEvent(run, "black"))}
                        className="w-full border border-[#C93A2B] bg-[#301316] py-1.5 font-serif text-xs font-bold text-[#F7B5AD] hover:bg-[#471A1F] lg:py-2 lg:text-sm"
                      >
                        黒き契約を結ぶ
                      </button>
                    </div>
                  )}

                  {offeredWhite && (
                    <div className="flex flex-col justify-between space-y-2 border border-[#D4AF37] bg-[#1E1A11] p-2.5 lg:space-y-3 lg:p-3.5">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif text-sm font-bold text-[#F7DF9C] lg:hidden">
                            {offeredWhite.name}
                          </span>
                          <span className="hidden font-mono text-[10px] tracking-widest text-[#F4D06F] lg:inline">
                            WHITE REVELATION
                          </span>
                          <span className="shrink-0 border border-[#8A7348] bg-[#0B0A0E] px-1.5 py-0.5 font-mono text-[10px] text-[#F4D06F]">
                            白天啓・安定祝福
                          </span>
                        </div>
                        <div className="mt-1 hidden font-serif text-base font-bold text-[#F7DF9C] lg:block">
                          {offeredWhite.name}
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-[#ECE6D8] lg:text-xs lg:leading-relaxed">
                          {offeredWhite.description}
                        </p>
                        <p className="mt-1.5 hidden text-[11px] italic text-[#A39880] lg:block">
                          {offeredWhite.flavor}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRun(resolveCovenantEvent(run, "white"))}
                        className="w-full border border-[#D4AF37] bg-[#2B2210] py-1.5 font-serif text-xs font-bold text-[#F7DF9C] hover:bg-[#3B2F16] lg:py-2 lg:text-sm"
                      >
                        白き天啓を授かる
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setRun(resolveCovenantEvent(run, "skip"))}
                  className="w-full border border-[#4A453C] bg-[#0B0A0E] py-1.5 font-mono text-[11px] text-[#CFC8B8] hover:border-[#8A7348] lg:py-2 lg:text-xs"
                >
                  {run.relicIds.includes("black_pact_ascetic")
                    ? "見送る（禁欲の代償により回復無効）"
                    : offeredBlack && offeredWhite
                      ? "どちらも選ばず見送る（HP+10 回復）"
                      : offeredWhite
                        ? "天啓を受けず見送る（HP+10 回復）"
                        : "契約を結ばず見送る（HP+10 回復）"}
                </button>
              </div>
            );
          })()}

        {/* === EVENT: LIBRARY PURGE / UPGRADE / HEAL === */}
        {run.phase === "event_library" && (() => {
          const selectedLibCard =
            run.deck.find((c) => c.instanceId === selectedLibraryCardId) ?? null;
          const isAscetic = run.relicIds.includes("black_pact_ascetic");
          const fCount = run.deck.filter((c) => c.rank === "F").length;
          const healAmt = Math.floor(run.playerMaxHp * 0.35);
          return (
            <div className="kaku-frame space-y-2.5 p-3 lg:space-y-4 lg:p-5">
              {/* Compact Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <BookMarked className="h-4 w-4 shrink-0 text-[#E3B94E] lg:h-5 lg:w-5" />
                  <div>
                    <h2 className="font-serif text-base font-extrabold text-[#F2ECE0] lg:text-lg">
                      静寂の書庫（推敲・休息）
                    </h2>
                    <p className="hidden text-xs text-[#A89F8E] lg:block">
                      休息・『不』の一括削除・カードの削除または+3強化を行える（最大2回）。
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <span className="inline-flex items-center gap-1 border border-[#2F7D5B] bg-[#11221B] px-2 py-0.5 font-mono text-[11px] font-bold text-[#57B889] lg:px-2.5 lg:py-1 lg:text-xs">
                    <Heart className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                    {run.playerHp}/{run.playerMaxHp}
                  </span>
                  <span className="shrink-0 border border-[#8A7348] bg-[#16131C] px-2 py-0.5 font-mono text-[11px] font-bold text-[#E3B94E] lg:px-2.5 lg:py-1 lg:text-xs">
                    残 {run.libraryActionsRemaining}回
                  </span>
                </div>
              </div>

              {/* Global Actions (Heal & Purge F) */}
              <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
                <button
                  type="button"
                  disabled={isAscetic}
                  onClick={() => setRun(resolveLibraryEvent(run, "heal"))}
                  className="w-full border border-[#2F7D5B] bg-[#11221B] px-2 py-2 font-serif text-xs font-bold text-[#57B889] hover:bg-[#173026] disabled:cursor-not-allowed disabled:opacity-40 lg:px-3 lg:py-2.5 lg:text-sm"
                >
                  <span className="lg:hidden">
                    {isAscetic ? "休息不可（禁欲）" : `休息 (HP+${healAmt})`}
                  </span>
                  <span className="hidden lg:inline">
                    {isAscetic
                      ? "書庫で休息する（禁欲の代償により利用不可）"
                      : `書庫で休息する（HP+${healAmt}／最大HPの35%回復）`}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={fCount === 0 || run.deck.length <= 4}
                  onClick={() => {
                    setRun(resolveLibraryEvent(run, "purge_all_f"));
                    setSelectedLibraryCardId(null);
                  }}
                  className="w-full border border-[#8E352E] bg-[#241315] px-2 py-2 font-serif text-xs font-bold text-[#F08A7E] hover:bg-[#33191C] disabled:cursor-not-allowed disabled:opacity-40 lg:px-3 lg:py-2.5 lg:text-sm"
                >
                  『不』一括削除（{fCount}枚）
                </button>
              </div>

              {/* Mobile: Slay-the-Spire style horizontal deck rail + detail + actions (Fits 1 screen) */}
              <div className="space-y-2 lg:hidden">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#8A7348]">
                    推敲するカードを選択（左右スワイプ可）
                  </span>
                  <span className="text-[#968E7E]">デッキ {run.deck.length}枚</span>
                </div>

                <div className="touch-pan-x overflow-x-auto overscroll-x-contain">
                  <div className="mx-auto flex w-max min-w-full items-end justify-start gap-1.5 px-2 pt-4 pb-1.5">
                    {run.deck.map((c, idx) => {
                      const isSelected = selectedLibCard?.instanceId === c.instanceId;
                      return (
                        <motion.div
                          key={c.instanceId}
                          layout
                          animate={
                            isSelected ? { y: -10, scale: 1.05 } : { y: 0, scale: 1 }
                          }
                          transition={{ type: "spring", stiffness: 420, damping: 28 }}
                          style={{ zIndex: isSelected ? 20 : idx + 1 }}
                          className="relative shrink-0"
                        >
                          <WordCard
                            word={c}
                            effectiveCost={getEffectiveCardCost(run, c)}
                            plusLevel={c.plusLevel}
                            selected={isSelected}
                            isTemporaryTrial={c.isTemporaryTrial}
                            compact
                            mini
                            disableLift
                            className="w-[80px] min-h-[102px]"
                            onClick={() =>
                              setSelectedLibraryCardId((prev) =>
                                prev === c.instanceId ? null : c.instanceId
                              )
                            }
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Fixed-height Selected Card Upgrade Preview */}
                <div className="flex min-h-[70px] flex-col justify-center border border-[#3A332A] bg-[#17141D] px-2.5 py-1.5 text-xs text-[#DCD4C2]">
                  {selectedLibCard ? (() => {
                    const rankMeta = RANK_META[selectedLibCard.rank];
                    const attrMeta = ATTR_META[selectedLibCard.attribute];
                    const skillMeta = SKILL_META[selectedLibCard.skillType];
                    const before = getEffectiveStats(selectedLibCard, selectedLibCard.plusLevel);
                    const after = getEffectiveStats(selectedLibCard, selectedLibCard.plusLevel + 3);
                    const effCost = getEffectiveCardCost(run, selectedLibCard);
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                          <div className="flex min-w-0 items-center gap-1">
                            <span style={{ color: rankMeta.color }} className="shrink-0 font-serif font-bold">
                              [{rankMeta.kanji}]
                            </span>
                            <strong className="truncate font-serif text-xs text-[#F4D06F]">
                              {selectedLibCard.term}
                            </strong>
                            {selectedLibCard.plusLevel > 0 && (
                              <span className="shrink-0 text-[#E3B94E]">+{selectedLibCard.plusLevel}</span>
                            )}
                            <span style={{ color: attrMeta.color }} className="shrink-0">
                              [{attrMeta.label}]
                            </span>
                          </div>
                          <span className="shrink-0 text-[#ECE6D8]">{effCost}コス</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-0.5 text-[#F07167]">
                              <Sword className="h-3 w-3" />
                              {before.atk}
                              <span className="text-[#E3B94E]">→{after.atk}</span>
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[#69A3D9]">
                              <Shield className="h-3 w-3" />
                              {before.def}
                              <span className="text-[#E3B94E]">→{after.def}</span>
                            </span>
                          </div>
                          <span
                            style={{ color: skillMeta.color }}
                            className="border border-[#2E2822] bg-[#0B0A0E] px-1.5 py-0.5 font-bold"
                          >
                            {skillMeta.shortTag}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[10px] leading-snug text-[#CFC8B8]">
                          {selectedLibCard.skillDesc}
                        </p>
                      </div>
                    );
                  })() : (
                    <p className="text-center font-mono text-[10px] text-[#787166]">
                      上のカードをタップして「+3強化」または「削除」を選択
                    </p>
                  )}
                </div>

                {/* Upgrade & Remove Action Buttons */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={!selectedLibCard}
                    onClick={() => {
                      if (!selectedLibCard) return;
                      setRun(resolveLibraryEvent(run, "upgrade", selectedLibCard.instanceId));
                    }}
                    className="border border-[#8A7348] bg-[#261E0E] py-2 font-mono text-xs font-bold text-[#E3B94E] hover:bg-[#362A14] disabled:cursor-not-allowed disabled:border-[#2A241E] disabled:bg-[#121016] disabled:text-[#5C564C]"
                  >
                    +3強化（攻防+{PLUS_STAT_STEP * 3}）
                  </button>
                  <button
                    type="button"
                    disabled={!selectedLibCard || run.deck.length <= 4}
                    onClick={() => {
                      if (!selectedLibCard) return;
                      setRun(resolveLibraryEvent(run, "remove", selectedLibCard.instanceId));
                      setSelectedLibraryCardId(null);
                    }}
                    className="border border-[#5C3530] bg-[#261A19] py-2 font-mono text-xs font-bold text-[#E05A47] hover:bg-[#38211F] disabled:cursor-not-allowed disabled:border-[#2A241E] disabled:bg-[#121016] disabled:text-[#5C564C]"
                  >
                    {run.deck.length <= 4 ? "削除不可(最低4枚)" : "カードを削除"}
                  </button>
                </div>
              </div>

              {/* PC: Original 2-column scrollable card list */}
              <div className="hidden space-y-2 lg:block">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] text-[#8A7348]">
                    カードを選んで推敲（+3強化 or 削除）：
                  </p>
                  <span className="font-mono text-[11px] text-[#968E7E]">
                    デッキ {run.deck.length}枚
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {run.deck.map((c) => {
                    const rankMeta = RANK_META[c.rank];
                    const attrMeta = ATTR_META[c.attribute];
                    const skillMeta = SKILL_META[c.skillType];
                    const effectiveCost = getEffectiveCardCost(run, c);
                    const beforeStats = getEffectiveStats(c, c.plusLevel);
                    const afterStats = getEffectiveStats(c, c.plusLevel + 3);

                    return (
                      <div
                        key={c.instanceId}
                        className="flex flex-col justify-between gap-2 border border-[#2E2822] bg-[#0B0A0E] p-3 text-xs transition-colors hover:border-[#5C4E38]"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span
                                style={{
                                  color: rankMeta.color,
                                  backgroundColor: rankMeta.bg,
                                  borderColor: rankMeta.border,
                                }}
                                className="inline-flex h-5 w-5 shrink-0 items-center justify-center border font-serif text-[11px] font-extrabold"
                              >
                                {rankMeta.kanji}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate font-serif text-sm font-extrabold text-[#F2ECE0]">
                                    {c.term}
                                  </span>
                                  {c.plusLevel > 0 && (
                                    <span className="shrink-0 border border-[#8A7348] bg-[#261E0E] px-1 py-0.5 font-mono text-[10px] font-bold leading-none text-[#E3B94E]">
                                      +{c.plusLevel}
                                    </span>
                                  )}
                                </div>
                                <span className="block truncate font-sans text-[10px] text-[#8E8678]">
                                  {c.reading}
                                </span>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1 font-mono text-[10px]">
                              <span className="border border-[#3A332A] bg-[#16131C] px-1.5 py-0.5 font-bold text-[#ECE6D8]">
                                {effectiveCost}コス
                              </span>
                              <span
                                style={{ color: attrMeta.color }}
                                className="border border-[#2E2822] bg-[#121016] px-1.5 py-0.5 font-bold"
                              >
                                {attrMeta.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-1.5 border-y border-[#1F1B17] py-1.5 font-mono text-[11px]">
                            <div className="flex items-center gap-2.5">
                              <span className="inline-flex items-center gap-1 text-[#F07167]">
                                <Sword className="h-3 w-3" />
                                {beforeStats.atk}
                                <span className="text-[#E3B94E]">→{afterStats.atk}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-[#69A3D9]">
                                <Shield className="h-3 w-3" />
                                {beforeStats.def}
                                <span className="text-[#E3B94E]">→{afterStats.def}</span>
                              </span>
                            </div>
                            <span
                              style={{ color: skillMeta.color }}
                              className="border border-[#3A332A] bg-[#141218] px-1.5 py-0.5 text-[10px] font-bold"
                            >
                              {skillMeta.shortTag}
                            </span>
                          </div>

                          <p className="text-[11px] leading-relaxed text-[#CFC8B8]">
                            {c.skillDesc}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setRun(resolveLibraryEvent(run, "upgrade", c.instanceId))
                            }
                            className="flex-1 border border-[#8A7348] bg-[#261E0E] px-2.5 py-1.5 font-mono text-[11px] font-bold text-[#E3B94E] hover:bg-[#362A14]"
                          >
                            +3強化（攻防+{PLUS_STAT_STEP * 3}）
                          </button>
                          {run.deck.length > 4 && (
                            <button
                              type="button"
                              onClick={() =>
                                setRun(resolveLibraryEvent(run, "remove", c.instanceId))
                              }
                              className="border border-[#5C3530] bg-[#261A19] px-3 py-1.5 font-mono text-[11px] font-bold text-[#E05A47] hover:bg-[#38211F]"
                            >
                              削除
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRun(resolveLibraryEvent(run, "leave"));
                  setSelectedLibraryCardId(null);
                }}
                className="w-full border border-[#3A332A] bg-[#0B0A0E] py-2 font-mono text-xs text-[#968E7E] hover:border-[#8A7348] hover:text-[#ECE6D8]"
              >
                書庫を出る（次の階層へ進む）
              </button>
            </div>
          );
        })()}

        {/* === STAGE CLEAR (Option for Endless!) === */}
        {run.phase === "stage_clear" && (
          <div className="kaku-frame space-y-4 p-5 text-center">
            <p className="font-mono text-xs tracking-widest text-[#E3B94E]">
              STAGE CONQUERED
            </p>
            <h2 className="font-serif text-2xl font-extrabold text-[#F2ECE0]">
              {run.stageName} 踏破！
            </h2>
            <p className="text-xs text-[#A89F8E]">
              最大出力：{formatJapaneseNumber(run.maxDamageDealt).text}
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRun(proceedNextBattleFloor(run, true))}
                className="flex items-center justify-center gap-2 border border-[#C93A2B] bg-[#291112] py-3 font-serif text-sm font-extrabold text-[#F2ECE0] hover:bg-[#C93A2B]"
              >
                <Flame className="h-4 w-4" />
                <span>無間階層（エンドレス）へ</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  finalizeRunRecord(run, true);
                  setRun(null);
                }}
                className="border border-[#8A7348] bg-[#261E0E] py-3 font-serif text-sm font-bold text-[#E3B94E] hover:bg-[#352A14]"
              >
                凱旋して記録を残す
              </button>
            </div>
          </div>
        )}

        {/* === GAMEOVER === */}
        {run.phase === "gameover" && (
          <div className="border border-[#5C3530] bg-[#180E10] p-5 text-center space-y-4">
            <h2 className="font-serif text-2xl font-extrabold text-[#E05A47]">
              言霊霧散 — 敗北
            </h2>
            <div className="grid grid-cols-2 gap-2 border border-[#3A332A] bg-[#0B0A0E] p-3 font-mono text-xs">
              <div>
                <span className="block text-[10px] text-[#8E8678]">到達階層</span>
                <strong className="text-base text-[#ECE6D8]">第{run.floor}階</strong>
              </div>
              <div>
                <span className="block text-[10px] text-[#8E8678]">最大一撃</span>
                <strong className="text-base text-[#E3B94E]">
                  {formatJapaneseNumber(run.maxDamageDealt).text}
                </strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRun(null)}
              className="inline-flex items-center gap-2 border border-[#8A7348] bg-[#1A1620] px-6 py-2.5 font-serif text-sm font-bold text-[#ECE6D8] hover:border-[#D4AF37]"
            >
              <RotateCcw className="h-4 w-4" />
              <span>ロビーへ戻る</span>
            </button>
          </div>
        )}
      </section>

      {/* PC Right Panel: Live Multiplier HUD & Battle Log */}
      <aside className="hidden space-y-3 lg:block">
        <div className="border border-[#2E2822] bg-[#121016] p-3">
          <span className="mb-2 block border-b border-[#2A241E] pb-1.5 font-mono text-[11px] font-bold text-[#8A7348]">
            現在の戦況・倍率
          </span>
          {renderRunMultiplierRows(run)}
        </div>

        <div className="border border-[#2E2822] bg-[#121016] p-3">
          <span className="block border-b border-[#2A241E] pb-1.5 font-mono text-[11px] font-bold text-[#8A7348]">
            戦闘履歴
          </span>
          <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto text-[11px] leading-snug text-[#B4ABA0]">
            {run.logs.map((line, i) => (
              <li key={i} className="border-b border-[#1E1A22] pb-1">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Current Battle Deck / Draw / Discard Modal */}
      <Dialog open={deckModalOpen} onOpenChange={setDeckModalOpen}>
        <DialogContent className="rounded-none border border-[#8A7348] bg-[#121016] text-[#ECE6D8] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-[#F2ECE0]">
              現在のデッキ・山札確認
            </DialogTitle>
            <p className="text-[11px] text-[#A89F8E]">
              不要なカードや『不』の削除（デッキ圧縮）は進行ルート上の「書庫」ノードで行えます。
            </p>
          </DialogHeader>
          <Tabs
            value={deckTab}
            onValueChange={(v) => setDeckTab(v as "all" | "draw" | "discard")}
            className="space-y-3"
          >
            <TabsList className="h-auto w-full justify-start gap-1 rounded-none border border-[#2E2822] bg-[#0B0A0E] p-1">
              <TabsTrigger
                value="all"
                className="rounded-none px-3 py-1 font-mono text-xs data-[state=active]:bg-[#261E0E] data-[state=active]:text-[#E3B94E]"
              >
                全デッキ ({run.deck.length})
              </TabsTrigger>
              <TabsTrigger
                value="draw"
                className="rounded-none px-3 py-1 font-mono text-xs data-[state=active]:bg-[#261E0E] data-[state=active]:text-[#E3B94E]"
              >
                山札 ({run.drawPile.length})
              </TabsTrigger>
              <TabsTrigger
                value="discard"
                className="rounded-none px-3 py-1 font-mono text-xs data-[state=active]:bg-[#261E0E] data-[state=active]:text-[#E3B94E]"
              >
                捨札 ({run.discardPile.length + run.playedThisTurn.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {run.deck.map((c) => (
                  <WordCard
                    key={c.instanceId}
                    word={c}
                    effectiveCost={getEffectiveCardCost(run, c)}
                    plusLevel={c.plusLevel}
                    isTemporaryTrial={c.isTemporaryTrial}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="draw" className="max-h-[60vh] overflow-y-auto pr-1">
              {run.drawPile.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#968E7E]">
                  山札は空です（次回ドロー時に捨札がシャッフルされます）。
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {run.drawPile.map((c) => (
                    <WordCard
                      key={c.instanceId}
                      word={c}
                      effectiveCost={getEffectiveCardCost(run, c)}
                      plusLevel={c.plusLevel}
                      isTemporaryTrial={c.isTemporaryTrial}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="discard" className="max-h-[60vh] overflow-y-auto pr-1">
              {run.discardPile.length + run.playedThisTurn.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#968E7E]">
                  捨札はありません。
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {run.playedThisTurn.map((c) => (
                    <WordCard
                      key={c.instanceId}
                      word={c}
                      effectiveCost={getEffectiveCardCost(run, c)}
                      plusLevel={c.plusLevel}
                      isTemporaryTrial={c.isTemporaryTrial}
                      badgeText="今ターン使用済"
                    />
                  ))}
                  {run.discardPile.map((c) => (
                    <WordCard
                      key={c.instanceId}
                      word={c}
                      effectiveCost={getEffectiveCardCost(run, c)}
                      plusLevel={c.plusLevel}
                      isTemporaryTrial={c.isTemporaryTrial}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Mobile HUD & Battle Log Modal */}
      <Dialog open={hudModalOpen} onOpenChange={setHudModalOpen}>
        <DialogContent className="rounded-none border border-[#8A7348] bg-[#121016] text-[#ECE6D8] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-[#F2ECE0]">
              現在の戦況・倍率と戦闘履歴
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border border-[#2E2822] bg-[#0B0A0E] p-3">
              {renderRunMultiplierRows(run)}
            </div>
            <div className="border border-[#2E2822] bg-[#0B0A0E] p-3">
              <span className="mb-2 block border-b border-[#2A241E] pb-1.5 font-mono text-[11px] font-bold text-[#8A7348]">
                戦闘履歴
              </span>
              {run.logs.length === 0 ? (
                <p className="text-xs text-[#787166]">まだ履歴がありません。</p>
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto text-[11px] leading-snug text-[#B4ABA0]">
                  {run.logs.map((line, i) => (
                    <li key={i} className="border-b border-[#1E1A22] pb-1">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Relics Modal */}
      <Dialog open={relicModalOpen} onOpenChange={setRelicModalOpen}>
        <DialogContent className="rounded-none border border-[#8A7348] bg-[#121016] text-[#ECE6D8]">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold">
              所持遺物一覧 ({relics.length})
            </DialogTitle>
          </DialogHeader>
          {relics.length === 0 ? (
            <p className="text-xs text-[#968E7E]">まだ遺物を所持していません。</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {groupedRelics.map(({ relic: r, count }) => (
                <li key={r.id} className="border border-[#2E2822] bg-[#0B0A0E] p-2.5">
                  <div className="font-serif text-sm font-bold text-[#E3B94E]">
                    {r.name}
                    {count > 1 && (
                      <span className="ml-1.5 font-mono text-xs text-[#69A3D9]">
                        ×{count}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#CFC8B8]">{r.description}</p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Single Relic Detail Modal (PC) */}
      <Dialog
        open={Boolean(activeRelicDetail)}
        onOpenChange={(open) => !open && setActiveRelicDetail(null)}
      >
        <DialogContent className="rounded-none border border-[#8A7348] bg-[#121016] text-[#ECE6D8]">
          {activeRelicDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-lg font-bold text-[#E3B94E]">
                  {activeRelicDetail.name}
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs leading-relaxed text-[#ECE6D8]">
                {activeRelicDetail.description}
              </p>
              <p className="text-[11px] italic text-[#968E7E]">
                {activeRelicDetail.flavor}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
