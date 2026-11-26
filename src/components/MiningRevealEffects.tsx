"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { Rank } from "@/types/game";

interface ExcavationBannerBurstProps {
  revealSeq: number;
  newCount: number;
  upgradedCount: number;
  hasUR: boolean;
  hasSSR: boolean;
  isDuplicate: boolean;
}

const BURST_PARTICLES = [
  { x: -160, y: -60 },
  { x: 165, y: -55 },
  { x: -220, y: 15 },
  { x: 225, y: 20 },
  { x: -110, y: -95 },
  { x: 115, y: -90 },
  { x: -140, y: 85 },
  { x: 145, y: 90 },
  { x: 0, y: -110 },
  { x: 0, y: 105 },
];

/**
 * Brief high-energy summon ritual seal shown right before pack cards appear.
 */
export function SummonCeremonyPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.18 }}
      className="kaku-frame relative flex flex-col items-center justify-center overflow-hidden py-14 text-center"
    >
      <div
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at center, rgba(212,175,55,0.22) 0%, transparent 65%)",
        }}
        className="pointer-events-none absolute inset-0"
      />
      <motion.svg
        viewBox="0 0 120 120"
        animate={{ rotate: 180, scale: [0.82, 1.06, 0.96] }}
        transition={{ duration: 0.48, ease: "easeInOut" }}
        className="h-24 w-24 text-[#E3B94E] drop-shadow-[0_0_18px_rgba(244,208,111,0.55)]"
      >
        <polygon
          points="60,6 98,22 114,60 98,98 60,114 22,98 6,60 22,22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <rect
          x="26"
          y="26"
          width="68"
          height="68"
          fill="none"
          stroke="#F4D06F"
          strokeWidth="1.8"
          transform="rotate(45 60 60)"
        />
        <circle cx="60" cy="60" r="18" fill="none" stroke="#E05A47" strokeWidth="2" />
      </motion.svg>
      <motion.p
        initial={{ opacity: 0.4, letterSpacing: "0.18em" }}
        animate={{ opacity: 1, letterSpacing: "0.32em" }}
        transition={{ duration: 0.35 }}
        className="mt-3 font-serif text-base font-extrabold text-[#F7F3EA]"
      >
        言霊召喚 — 解析中
      </motion.p>
    </motion.div>
  );
}

/**
 * Full-panel summon burst overlay triggered right when a pack is excavated.
 */
export function SummonPortalFlash({
  revealSeq,
  hasUR,
  hasSSR,
}: {
  revealSeq: number;
  hasUR: boolean;
  hasSSR: boolean;
}) {
  const accent = hasUR
    ? "rgba(224, 90, 71, 0.45)"
    : hasSSR
      ? "rgba(244, 208, 111, 0.4)"
      : "rgba(212, 175, 55, 0.24)";
  const sparkColor = hasUR ? "#F07167" : hasSSR ? "#F4D06F" : "#E3B94E";

  return (
    <div
      key={`portal_flash_${revealSeq}`}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0.95, scale: 0.84 }}
        animate={{ opacity: 0, scale: 1.18 }}
        transition={{ duration: hasUR ? 0.78 : 0.56, ease: "easeOut" }}
        style={{
          background: `radial-gradient(circle at 50% 35%, ${accent} 0%, transparent 68%)`,
        }}
        className="absolute inset-0"
      />
      {(hasUR || hasSSR) && (
        <motion.div
          initial={{ scale: 0.3, opacity: 0.9, rotate: 0 }}
          animate={{ scale: 2.2, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.72, ease: "easeOut" }}
          style={{ borderColor: sparkColor }}
          className="h-36 w-36 rounded-full border-2"
        />
      )}
      {BURST_PARTICLES.map((p, idx) => (
        <motion.span
          key={`${p.x}_${p.y}`}
          initial={{ x: 0, y: -40, scale: 1.3, opacity: 0.95 }}
          animate={{
            x: p.x * (hasUR ? 1.35 : 1),
            y: -40 + p.y * (hasUR ? 1.35 : 1),
            scale: 0.2,
            opacity: 0,
          }}
          transition={{ duration: 0.62, delay: idx * 0.015, ease: "easeOut" }}
          style={{ backgroundColor: idx % 2 === 0 ? "#F7F3EA" : sparkColor }}
          className="absolute h-2 w-2"
        />
      ))}
    </div>
  );
}

/**
 * Displays a crisp celebratory highlight strip & scan flash when a pack is excavated.
 */
export function ExcavationBannerBurst({
  revealSeq,
  newCount,
  upgradedCount,
  hasUR,
  hasSSR,
  isDuplicate,
}: ExcavationBannerBurstProps) {
  return (
    <motion.div
      key={`burst_${revealSeq}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="relative mb-3 overflow-hidden border border-[#5A4722] bg-[#16130E] px-3 py-2"
    >
      {/* Sweeping Excavation Light */}
      <motion.span
        aria-hidden="true"
        initial={{ x: "-100%", opacity: 0.65 }}
        animate={{ x: "220%", opacity: 0 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#F4D06F]/25 to-transparent"
      />

      <div className="relative flex flex-wrap items-center gap-2 font-mono text-[11px]">
        <span className="inline-flex items-center gap-1 font-bold text-[#F4D06F]">
          <Sparkles className="h-3.5 w-3.5 text-[#E3B94E]" />
          <span>{isDuplicate ? "解析スキャン完了" : "言霊採掘成功！"}</span>
        </span>
        {newCount > 0 && (
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 450, damping: 20, delay: 0.12 }}
            className="border border-[#2F7D5B] bg-[#11221B] px-1.5 py-0.5 font-bold text-[#6EE7B7]"
          >
            NEW ×{newCount}
          </motion.span>
        )}
        {upgradedCount > 0 && (
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 450, damping: 20, delay: 0.18 }}
            className="border border-[#8A7348] bg-[#261E0E] px-1.5 py-0.5 font-bold text-[#F4D06F]"
          >
            再発見強化 ×{upgradedCount}
          </motion.span>
        )}
        {hasSSR && (
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 460, damping: 18, delay: 0.24 }}
            className="border border-[#D4AF37] bg-[#2D220D] px-1.5 py-0.5 font-bold text-[#F7DF9C]"
          >
            『極』出土！
          </motion.span>
        )}
        {hasUR && (
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: [0.7, 1.15, 1], opacity: 1 }}
            transition={{ duration: 0.36, delay: 0.28 }}
            className="border border-[#E05A47] bg-[#301214] px-1.5 py-0.5 font-bold text-[#F7B5AD]"
          >
            未知語『異』観測！
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

interface MiningCardRevealFrameProps {
  revealSeq: number;
  index: number;
  rank: Rank;
  isNew: boolean;
  isUpgraded: boolean;
  children: ReactNode;
}

/**
 * Staggers mined card entry with rarity-tuned summon flash, shimmer sweep,
 * UR shockwave, and F-rank glitch tremor.
 */
export function MiningCardRevealFrame({
  revealSeq,
  index,
  rank,
  isNew,
  isUpgraded,
  children,
}: MiningCardRevealFrameProps) {
  const delay = (index % 2) * 0.085 + Math.floor(index / 2) * 0.06;
  const isUR = rank === "UR";
  const isSSR = rank === "SSR";
  const isF = rank === "F";
  const hasShine = isUR || isSSR || isNew || isUpgraded;

  const ringColor = isUR
    ? "border-[#E05A47] bg-[#E05A47]/25 shadow-[0_0_26px_rgba(224,90,71,0.55)]"
    : isSSR
      ? "border-[#F4D06F] bg-[#F4D06F]/22 shadow-[0_0_22px_rgba(244,208,111,0.45)]"
      : "border-[#6EE7B7] bg-[#6EE7B7]/14";

  const frameGlowClass = isUR
    ? "shadow-[0_0_18px_rgba(224,90,71,0.28)]"
    : isSSR
      ? "shadow-[0_0_16px_rgba(244,208,111,0.24)]"
      : "";

  return (
    <motion.div
      key={`mine_card_${revealSeq}_${index}`}
      initial={{ opacity: 0, scale: 0.78, y: 18, rotateY: 28 }}
      whileInView={
        isF
          ? { opacity: 1, scale: 1, y: 0, rotateY: 0, x: [0, -3, 3, -2, 0] }
          : { opacity: 1, scale: [0.78, 1.08, 1], y: 0, rotateY: 0 }
      }
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        delay,
        duration: isUR ? 0.44 : 0.3,
        ease: "easeOut",
      }}
      className={`relative flex flex-col gap-1.5 ${frameGlowClass}`}
    >
      {/* Summon Shockwave Ring for High Rank / New Discoveries */}
      {(isUR || isSSR || isNew) && (
        <motion.div
          aria-hidden="true"
          initial={{ scale: 0.8, opacity: 0.85 }}
          whileInView={{ scale: isUR ? 1.18 : 1.1, opacity: 0 }}
          viewport={{ once: true, amount: 0.08 }}
          transition={{ delay: delay + 0.05, duration: isUR ? 0.58 : 0.44, ease: "easeOut" }}
          className={`pointer-events-none absolute -inset-1 z-10 border-2 ${ringColor}`}
        />
      )}

      {/* Diagonal Shimmer Sweep over newly mined highlight cards */}
      {hasShine && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: [0, 1, 0] }}
          viewport={{ once: true, amount: 0.08 }}
          transition={{ delay: delay + 0.06, duration: 0.55 }}
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        >
          <motion.span
            initial={{ x: "-120%" }}
            whileInView={{ x: "220%" }}
            viewport={{ once: true, amount: 0.08 }}
            transition={{ delay: delay + 0.06, duration: 0.52, ease: "easeOut" }}
            className={`block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent ${
              isUR
                ? "via-[#F7B5AD]/35"
                : isSSR
                  ? "via-[#F7DF9C]/40"
                  : "via-[#9BD1B5]/25"
            } to-transparent`}
          />
        </motion.div>
      )}

      {children}
    </motion.div>
  );
}
