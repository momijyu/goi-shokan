"use client";

import React, {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  HelpCircle,
  Layers,
  Pickaxe,
  Trophy,
  UserCheck,
} from "lucide-react";
import { TutorialDialog } from "@/components/TutorialDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatJapaneseNumber } from "@/lib/bignum";
import {
  createInitialSaveData,
  loadSaveData,
  resetAllSaveData,
  saveSaveData,
} from "@/lib/storage";
import type { PlayerSaveData } from "@/types/game";

interface SaveContextValue {
  save: PlayerSaveData;
  hydrated: boolean;
  setSave: (next: PlayerSaveData) => void;
  resetSave: () => void;
  mobileBattleFullscreen: boolean;
  setMobileBattleFullscreen: (active: boolean) => void;
  openTutorial: () => void;
}

const SaveContext = createContext<SaveContextValue>({
  save: createInitialSaveData(),
  hydrated: false,
  setSave: () => {},
  resetSave: () => {},
  mobileBattleFullscreen: false,
  setMobileBattleFullscreen: () => {},
  openTutorial: () => {},
});

export function useSaveData() {
  return useContext(SaveContext);
}

const NAV_ITEMS = [
  { href: "/", label: "採掘", fullLabel: "召喚の間", icon: Pickaxe },
  { href: "/dungeon", label: "迷宮", fullLabel: "迷宮挑戦", icon: Compass },
  { href: "/deck", label: "辞書", fullLabel: "マイ辞書", icon: Layers },
  { href: "/codex", label: "図鑑", fullLabel: "図鑑・実績", icon: BookOpen },
  { href: "/records", label: "記録", fullLabel: "戦績・順位", icon: Trophy },
];

const SERVER_SNAPSHOT = createInitialSaveData();
let clientSnapshotCache: PlayerSaveData | null = null;
const storeListeners = new Set<() => void>();

function subscribeSaveStore(listener: () => void): () => void {
  storeListeners.add(listener);
  return () => storeListeners.delete(listener);
}

function getClientSaveSnapshot(): PlayerSaveData {
  if (!clientSnapshotCache) {
    clientSnapshotCache = loadSaveData();
  }
  return clientSnapshotCache;
}

function getServerSaveSnapshot(): PlayerSaveData {
  return SERVER_SNAPSHOT;
}

const emptySubscribe = () => () => {};

export function GameShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const save = useSyncExternalStore(
    subscribeSaveStore,
    getClientSaveSnapshot,
    getServerSaveSnapshot
  );
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [guestNameInput, setGuestNameInput] = useState("");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [mobileBattleFullscreen, setMobileBattleFullscreen] = useState(false);
  const [manualTutorialOpen, setManualTutorialOpen] = useState(false);
  const isMobileDungeonImmersive = mobileBattleFullscreen && pathname === "/dungeon";

  const setSave = (next: PlayerSaveData) => {
    clientSnapshotCache = next;
    saveSaveData(next);
    storeListeners.forEach((l) => l());
  };

  const isTutorialOpen = manualTutorialOpen || (hydrated && !save.tutorialDismissed);

  const handleDismissTutorial = () => {
    setManualTutorialOpen(false);
    if (!save.tutorialDismissed) {
      setSave({ ...save, tutorialDismissed: true });
    }
  };

  const resetSave = () => {
    const fresh = resetAllSaveData();
    clientSnapshotCache = fresh;
    storeListeners.forEach((l) => l());
    setGuestNameInput(fresh.guestName);
  };

  const handleOpenAccount = (open: boolean) => {
    if (open) {
      setGuestNameInput(save.guestName);
    }
    setAccountDialogOpen(open);
  };

  const handleRenameGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = guestNameInput.trim().slice(0, 16) || "名無しの召喚士";
    setSave({ ...save, guestName: cleaned });
    setAccountDialogOpen(false);
  };

  const ownedCount = Object.keys(save.ownedWords).length;
  const bestFmt = formatJapaneseNumber(save.bestDamage);

  return (
    <SaveContext.Provider
      value={{
        save,
        hydrated,
        setSave,
        resetSave,
        mobileBattleFullscreen,
        setMobileBattleFullscreen,
        openTutorial: () => setManualTutorialOpen(true),
      }}
    >
      <div
        className={`flex flex-col overflow-x-clip bg-[#0B0A0E] text-[#ECE6D8] ${
          isMobileDungeonImmersive
            ? "max-lg:h-dvh max-lg:overflow-hidden max-lg:overscroll-none lg:min-h-dvh"
            : "min-h-dvh"
        }`}
      >
        {/* PC & Top Header (HyperUI-inspired clean structural bar) */}
        <header className="sticky top-0 z-40 border-b border-[#2E2822] bg-[#0B0A0E]">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center border border-[#C93A2B] bg-[#241010] font-serif text-sm font-extrabold text-[#ECE6D8]">
                語
              </span>
              <div className="leading-none">
                <span className="font-serif text-base font-extrabold tracking-wider text-[#F2ECE0]">
                  語彙召喚<span className="text-[#C93A2B]">(仮)</span>
                </span>
                <span className="block font-mono text-[9px] tracking-[0.2em] text-[#8A7348]">
                  GOI-SHOKAN(KARI)
                </span>
              </div>
            </Link>

            {/* PC Top Nav */}
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-[#8A7348] bg-[#1B1720] text-[#E3B94E]"
                        : "border-transparent text-[#A89F8E] hover:border-[#2E2822] hover:bg-[#141218] hover:text-[#ECE6D8]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.fullLabel}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Status + Help + Guest/Account Modal */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden items-center gap-3 border border-[#2A241E] bg-[#121016] px-2.5 py-1 font-mono text-[11px] sm:flex">
                <span className="text-[#968E7E]">
                  語彙 <strong className="text-[#ECE6D8]">{ownedCount}</strong>
                </span>
                <span className="text-[#3A332A]">|</span>
                <span className="text-[#968E7E]">
                  最大{" "}
                  <strong className={bestFmt.colorClass}>{bestFmt.text}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setManualTutorialOpen(true)}
                aria-label="遊び方ガイドを開く"
                className="flex items-center gap-1 border border-[#3A332A] bg-[#141218] px-2 py-1.5 text-xs text-[#E3B94E] transition-colors hover:border-[#8A7348] hover:bg-[#1E1912]"
              >
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden font-medium sm:inline">遊び方</span>
              </button>

              <Dialog open={accountDialogOpen} onOpenChange={handleOpenAccount}>
                <DialogTrigger
                  render={
                    <button
                      type="button"
                      className="flex items-center gap-1.5 border border-[#3A332A] bg-[#141218] px-2.5 py-1.5 text-xs text-[#CFC8B8] transition-colors hover:border-[#8A7348] hover:text-[#ECE6D8]"
                    />
                  }
                >
                  <UserCheck className="h-3.5 w-3.5 text-[#8A7348]" />
                  <span className="max-w-[92px] truncate font-medium">
                    {hydrated ? save.guestName : "読込中"}
                  </span>
                </DialogTrigger>
                <DialogContent className="rounded-none border border-[#8A7348] bg-[#121016] text-[#ECE6D8] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-lg font-bold text-[#F2ECE0]">
                      召喚士記録（ローカル保存）
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-xs leading-relaxed text-[#B4ABA0]">
                    <form onSubmit={handleRenameGuest} className="space-y-2">
                      <label className="block font-mono text-[11px] text-[#8A7348]">
                        召喚士名
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={guestNameInput}
                          onChange={(e) => setGuestNameInput(e.target.value)}
                          maxLength={16}
                          className="w-full border border-[#3A332A] bg-[#0B0A0E] px-3 py-2 text-sm text-[#ECE6D8] focus:border-[#D4AF37] focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="shrink-0 border border-[#8A7348] bg-[#261E0E] px-4 py-2 font-bold text-[#E3B94E] hover:bg-[#352A14]"
                        >
                          変更
                        </button>
                      </div>
                    </form>
                    <div className="space-y-3 border-t border-[#2A241E] pt-3">
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#968E7E]">
                        <a
                          href="/THIRD_PARTY_NOTICES.txt"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-[#E3B94E]"
                        >
                          言語データ出典・権利表記
                        </a>
                        <a
                          href="/APACHE-2.0.txt"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-[#E3B94E]"
                        >
                          Apache License 2.0
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          resetSave();
                          setAccountDialogOpen(false);
                        }}
                        className="border border-[#5C3530] bg-[#241212] px-3 py-1.5 text-[11px] text-[#E05A47] hover:bg-[#361A1A]"
                      >
                        セーブデータを初期化
                      </button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main
          className={`mx-auto w-full max-w-6xl flex-1 sm:px-6 ${
            isMobileDungeonImmersive
              ? "min-h-0 px-2.5 pt-1.5 pb-0 max-lg:overflow-y-auto max-lg:overscroll-none lg:pt-4 lg:pb-8"
              : "px-3 pt-4 pb-6 md:pb-8"
          }`}
        >
          {children}
        </main>

        {/* Subtle Legal & Data Attribution Footer (Visible on both Mobile and PC; hidden on mobile during active dungeon run to prevent mis-taps & vertical scroll) */}
        <footer
          className={`mx-auto w-full max-w-6xl flex-col gap-1.5 border-t border-[#221D18] px-3 pt-3 pb-20 font-mono text-[10px] text-[#6B6458] sm:px-6 md:flex-row md:items-center md:justify-between md:py-3 ${
            isMobileDungeonImmersive ? "hidden lg:flex" : "flex"
          }`}
        >
          <span className="leading-relaxed">
            辞書・語釈：kuromoji (Apache-2.0) / IPAdic (NAIST・ICOT) / SudachiDict (Apache-2.0) / 日本語WordNet (NICT)
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/THIRD_PARTY_NOTICES.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#E3B94E]"
            >
              権利表記・免責事項全文
            </a>
            <a
              href="/APACHE-2.0.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#E3B94E]"
            >
              Apache-2.0
            </a>
          </div>
        </footer>

        {/* Mobile Bottom Fixed Navigation (Thumb-friendly; hidden during active dungeon run to avoid mis-taps & browser bar overlap) */}
        {!isMobileDungeonImmersive && (
          <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#322C26] bg-[#0B0A0E] pb-[env(safe-area-inset-bottom)] md:hidden">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] ${
                    active
                      ? "border-t-2 border-[#C93A2B] bg-[#16131B] font-bold text-[#E3B94E]"
                      : "text-[#8E8678]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
      <TutorialDialog open={isTutorialOpen} onDismiss={handleDismissTutorial} />
    </SaveContext.Provider>
  );
}
