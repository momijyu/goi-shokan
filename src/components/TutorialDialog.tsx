"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  Layers,
  Pickaxe,
  Shield,
  Sparkles,
  Sword,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TutorialDialogProps {
  open: boolean;
  onDismiss: () => void;
}

const STEPS = [
  { id: 0, shortLabel: "1. ゲームの流れ", title: "言葉を集めて、迷宮を攻略しよう" },
  { id: 1, shortLabel: "2. 戦闘ルール", title: "1枚のカードに「攻・技・防」の3択" },
  { id: 2, shortLabel: "3. さあ始める", title: "まずは採掘か迷宮へ！" },
] as const;

export function TutorialDialog({ open, onDismiss }: TutorialDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const handleClose = () => {
    setStep(0);
    onDismiss();
  };

  const handleGoTo = (href: string) => {
    setStep(0);
    onDismiss();
    router.push(href);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-none border border-[#8A7348] bg-[#121016] p-4 text-[#ECE6D8] sm:max-w-lg sm:p-5">
        <DialogHeader className="space-y-1.5 text-left">
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#8A7348]">
            HOW TO PLAY // 語彙召喚(仮) ガイド
          </p>
          <DialogTitle className="font-serif text-lg font-extrabold text-[#F7F3EA] sm:text-xl">
            {STEPS[step].title}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-3 gap-1 border border-[#2E2822] bg-[#0B0A0E] p-1">
          {STEPS.map((item) => {
            const active = step === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={`py-1.5 font-mono text-[10px] font-bold transition-colors sm:text-[11px] ${
                  active
                    ? "border border-[#8A7348] bg-[#261E0E] text-[#E3B94E]"
                    : "border border-transparent text-[#8E8678] hover:text-[#CFC8B8]"
                }`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Step 1: Overview */}
        {step === 0 && (
          <div className="space-y-2.5 text-xs leading-relaxed text-[#CFC8B8]">
            <p>
              好きな文章から「語彙カード」を召喚し、掛け算で火力を伸ばしながら迷宮最深部を目指すカードローグライクです。
            </p>

            <div className="space-y-2">
              <div className="flex items-start gap-2.5 border border-[#2E2822] bg-[#0B0A0E] p-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[#8A7348] bg-[#261E0E] text-[#E3B94E]">
                  <Pickaxe className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="font-serif font-bold text-[#F2ECE0]">
                    ① 文章採掘（召喚の間）
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#A89F8E]">
                    日記・小説・サンプル文などを解析して最大6枚の語彙カードを獲得します（同じ単語を連呼すると呪い札『不』が出ます）。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 border border-[#2E2822] bg-[#0B0A0E] p-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[#2F7D5B] bg-[#11221B] text-[#6EE7B7]">
                  <Layers className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="font-serif font-bold text-[#F2ECE0]">
                    ② マイ辞書 ＆ エース編成
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#A89F8E]">
                    初期カード20枚を所持済み。辞書IN（6〜30枚）が迷宮のドロップ候補になり、「エース」1枚は初手デッキに必ず入ります。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 border border-[#2E2822] bg-[#0B0A0E] p-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[#C93A2B] bg-[#261314] text-[#F08A7E]">
                  <Compass className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="font-serif font-bold text-[#F2ECE0]">
                    ③ 迷宮挑戦（通常・特殊ルール）
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#A89F8E]">
                    通常迷宮（第一〜三層）に加え、マイ辞書不要の「混沌の無作為迷宮」「一文即興の迷宮」も遊べます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Battle Rules */}
        {step === 1 && (
          <div className="space-y-2.5 text-xs leading-relaxed text-[#CFC8B8]">
            <p>
              バトル中、手札のカードをタップして以下の <strong className="text-[#F4D06F]">3種類のコマンド</strong> から使い分けます。
            </p>

            <div className="space-y-2">
              <div className="flex items-start gap-2.5 border border-[#5C3530] bg-[#1A0E10] p-2.5">
                <Sword className="mt-0.5 h-4 w-4 shrink-0 text-[#F07167]" />
                <div>
                  <div className="font-serif font-bold text-[#F2ECE0]">
                    こうげき <span className="font-mono text-[10px] text-[#F07167]">感情・感覚なら ×1.25</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#B4ABA0]">
                    カードの赤数値（攻）に現在の倍率を掛けてダメージを与えます。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 border border-[#8A7348]/70 bg-[#1B160D] p-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#E3B94E]" />
                <div>
                  <div className="font-serif font-bold text-[#F2ECE0]">
                    スキル <span className="font-mono text-[10px] text-[#E3B94E]">コンボの起点</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#B4ABA0]">
                    山札ドロー・コスト回復・乗算倍率UP・再発動などの固有効果を発動します。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 border border-[#2E5C8A] bg-[#101822] p-2.5">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#69A3D9]" />
                <div>
                  <div className="font-serif font-bold text-[#F2ECE0]">
                    ぼうぎょ <span className="font-mono text-[10px] text-[#69A3D9]">論理・物質なら ×1.25</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#B4ABA0]">
                    敵の「次：攻撃」予告に合わせてシールドを張り、HPへの直撃を防ぎます。
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-[#2E2822] bg-[#0B0A0E] p-2.5 text-[11px] text-[#A89F8E]">
              <strong className="text-[#E3B94E]">勝つコツ：</strong>
              最初に <strong className="text-[#ECE6D8]">スキル</strong> で倍率や再発動を乗せてから <strong className="text-[#ECE6D8]">こうげき</strong> を撃つとダメージが桁違いに伸びます！
            </div>
          </div>
        )}

        {/* Step 3: Start Path */}
        {step === 2 && (
          <div className="space-y-3 text-xs leading-relaxed text-[#CFC8B8]">
            <p>
              準備はできています！まずは好きな文章から1パック採掘してみるか、初期デッキのまま「第一層」へ挑んでみましょう。
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleGoTo("/")}
                className="flex w-full items-center justify-between gap-3 border border-[#D4AF37] bg-[#261E0E] px-4 py-3 text-left transition-colors hover:bg-[#3A2E14]"
              >
                <div>
                  <div className="font-serif text-sm font-extrabold text-[#F4D06F]">
                    ① 文章を採掘してみる（おすすめ）
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#DCD4C2]">
                    召喚の間でサンプル文や自分の文章からカードを生み出す
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#E3B94E]" />
              </button>

              <button
                type="button"
                onClick={() => handleGoTo("/dungeon")}
                className="flex w-full items-center justify-between gap-3 border border-[#C93A2B] bg-[#261314] px-4 py-3 text-left transition-colors hover:bg-[#3A1B1D]"
              >
                <div>
                  <div className="font-serif text-sm font-extrabold text-[#F7F3EA]">
                    ② 初期デッキのまま迷宮へ挑む
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#DCD4C2]">
                    支給済みの20枚ですぐに第一層「口癖の沼地」をプレイ
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#F08A7E]" />
              </button>
            </div>

            <p className="font-mono text-[10px] text-[#8E8678]">
              ※ 画面上部の「? 遊び方」からいつでもこの説明を開き直せます。
            </p>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between gap-2 border-t border-[#2E2822] pt-3">
          <button
            type="button"
            onClick={handleClose}
            className="font-mono text-[11px] text-[#8E8678] hover:text-[#ECE6D8]"
          >
            スキップして閉じる
          </button>

          <div className="flex items-center gap-1.5">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="inline-flex items-center gap-1 border border-[#3A332A] bg-[#141218] px-3 py-1.5 font-mono text-xs text-[#CFC8B8] hover:border-[#8A7348]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>戻る</span>
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="inline-flex items-center gap-1 border border-[#8A7348] bg-[#261E0E] px-4 py-1.5 font-serif text-xs font-bold text-[#E3B94E] hover:bg-[#3A2E14]"
              >
                <span>次へ</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="border border-[#8A7348] bg-[#261E0E] px-4 py-1.5 font-serif text-xs font-bold text-[#E3B94E] hover:bg-[#3A2E14]"
              >
                閉じる
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
