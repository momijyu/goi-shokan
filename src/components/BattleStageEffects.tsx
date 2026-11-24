"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PixelMonster } from "@/components/PixelMonster";
import { ATTR_META, type Attribute } from "@/types/game";

export interface CombatVisualEffect {
  id: number;
  enemyMotionId?: number;
  floor?: number;
  kind:
    | "attack"
    | "pierce"
    | "guard"
    | "skill"
    | "enemy_attack"
    | "enemy_blocked"
    | "enemy_guard";
  amountText: string;
  subLabel?: string;
  colorClass: string;
  shakeLevel: 0 | 1 | 2 | 3;
  retriggers: number;
  attribute?: Attribute;
  isLethal?: boolean;
}

interface AnimatedEnemySpriteProps {
  spriteId: string;
  attribute: Attribute;
  size: number;
  isBoss?: boolean;
  effect: CombatVisualEffect | null;
  compact?: boolean;
}

const SLASH_PATHS = [
  "M 10 86 L 90 14",
  "M 14 18 L 86 84",
  "M 6 52 L 94 46",
  "M 26 92 L 76 10",
];

const SPARK_OFFSETS = [
  { x: -34, y: -24 },
  { x: 36, y: -20 },
  { x: -38, y: 18 },
  { x: 32, y: 24 },
  { x: 0, y: -40 },
  { x: 0, y: 36 },
];

function getShakeKeyframes(shakeLevel: 0 | 1 | 2 | 3, isLethal?: boolean) {
  const amp = isLethal ? 12 : 4 + shakeLevel * 3;
  return [0, -amp, amp, -Math.round(amp * 0.6), Math.round(amp * 0.5), 0];
}

/**
 * Wraps PixelMonster with slash overlays, hit flash/shake, enemy lunge,
 * lethal defeat dissolve, and floating combat numbers.
 */
export function AnimatedEnemySprite({
  spriteId,
  attribute,
  size,
  isBoss = false,
  effect,
  compact = false,
}: AnimatedEnemySpriteProps) {
  const isEnemyHit =
    effect !== null && (effect.kind === "attack" || effect.kind === "pierce");
  const isEnemyLunge =
    effect !== null &&
    (effect.kind === "enemy_attack" || effect.kind === "enemy_blocked");
  const isEnemyGuard = effect !== null && effect.kind === "enemy_guard";

  const hitAttrColor = effect?.attribute
    ? ATTR_META[effect.attribute].color
    : "#E05A47";
  const slashCount = isEnemyHit ? Math.min(4, Math.max(1, effect.retriggers)) : 0;
  const motionKey = effect?.enemyMotionId ?? 0;

  return (
    <div className="relative inline-flex items-center justify-center overflow-visible">
      <motion.div
        animate={{ y: [0, compact ? -2 : -3, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          key={`sprite_${motionKey}`}
          animate={
            isEnemyHit
              ? effect.isLethal
                ? {
                    x: getShakeKeyframes(effect.shakeLevel, true),
                    scale: [1, 1.08, 0.72],
                    opacity: [1, 0.95, 0.2],
                    filter: [
                      "brightness(2.6) saturate(1.8)",
                      "brightness(1.8)",
                      "brightness(0.45)",
                    ],
                  }
                : {
                    x: getShakeKeyframes(effect.shakeLevel),
                    scale: [1, 0.9, 1.04, 1],
                    filter: [
                      "brightness(1)",
                      "brightness(2.5) saturate(1.7)",
                      "brightness(1)",
                    ],
                  }
              : isEnemyLunge
                ? {
                    y: [0, 8, -2, 0],
                    scale: [1, 1.1, 1],
                  }
                : { x: 0, y: 0, scale: 1, opacity: 1 }
          }
          transition={
            isEnemyHit
              ? { duration: effect.isLethal ? 0.52 : 0.36, ease: "easeOut" }
              : isEnemyLunge
                ? { duration: 0.32, ease: "easeOut" }
                : { duration: 0.18 }
          }
          className="relative"
        >
          <PixelMonster
            spriteId={spriteId}
            attribute={attribute}
            size={size}
            isBoss={isBoss}
          />
        </motion.div>
      </motion.div>

      {/* Enemy Slash / Pierce / Spark FX Overlay */}
      <AnimatePresence>
        {isEnemyHit && effect && (
          <motion.div
            key={`fx_${effect.id}`}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: effect.isLethal ? 0.65 : 0.48, delay: 0.14 }}
            className={`pointer-events-none absolute flex items-center justify-center ${
              compact ? "inset-[-14%]" : "inset-[-22%]"
            }`}
          >
            {/* Expanding Shockwave Ring */}
            <motion.div
              initial={{ scale: 0.35, opacity: 0.9 }}
              animate={{ scale: effect.isLethal ? 1.55 : 1.25, opacity: 0 }}
              transition={{ duration: 0.38, ease: "easeOut" }}
              style={{ borderColor: hitAttrColor }}
              className="absolute inset-[10%] rounded-full border-2"
            />

            {/* Crisp SVG Blade Slashes */}
            <svg
              viewBox="0 0 100 100"
              className="h-full w-full overflow-visible drop-shadow-[0_0_8px_rgba(247,243,234,0.85)]"
            >
              {effect.kind === "pierce" && (
                <motion.path
                  d="M 2 50 L 98 50 M 76 34 L 98 50 L 76 66"
                  fill="none"
                  stroke="#F4D06F"
                  strokeWidth="5"
                  strokeLinecap="square"
                  initial={{ pathLength: 0, opacity: 1 }}
                  animate={{ pathLength: 1, opacity: [1, 1, 0] }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                />
              )}
              {SLASH_PATHS.slice(0, slashCount).map((d, idx) => (
                <g key={d}>
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={hitAttrColor}
                    strokeWidth={effect.shakeLevel >= 2 ? "9" : "7"}
                    strokeLinecap="square"
                    initial={{ pathLength: 0, opacity: 0.95 }}
                    animate={{ pathLength: 1, opacity: [0.95, 0.95, 0] }}
                    transition={{
                      duration: 0.24,
                      delay: idx * 0.055,
                      ease: "easeOut",
                    }}
                  />
                  <motion.path
                    d={d}
                    fill="none"
                    stroke="#F7F3EA"
                    strokeWidth="3"
                    strokeLinecap="square"
                    initial={{ pathLength: 0, opacity: 1 }}
                    animate={{ pathLength: 1, opacity: [1, 1, 0] }}
                    transition={{
                      duration: 0.24,
                      delay: idx * 0.055,
                      ease: "easeOut",
                    }}
                  />
                </g>
              ))}
            </svg>

            {/* Radial Pixel Sparks */}
            {SPARK_OFFSETS.slice(0, effect.shakeLevel >= 2 || effect.isLethal ? 6 : 4).map(
              (offset, idx) => (
                <motion.span
                  key={`${offset.x}_${offset.y}`}
                  initial={{ x: 0, y: 0, scale: 1.2, opacity: 1 }}
                  animate={{
                    x: offset.x * (compact ? 0.75 : 1),
                    y: offset.y * (compact ? 0.75 : 1),
                    scale: 0.2,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.36, delay: idx * 0.02, ease: "easeOut" }}
                  style={{
                    backgroundColor: idx % 2 === 0 ? "#F4D06F" : hitAttrColor,
                  }}
                  className="absolute h-1.5 w-1.5"
                />
              )
            )}
          </motion.div>
        )}

        {isEnemyGuard && effect && (
          <motion.div
            key={`eguard_${effect.id}`}
            initial={{ scale: 0.6, opacity: 0.95 }}
            animate={{ scale: 1.25, opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="pointer-events-none absolute inset-[-10%] border-2 border-[#5B9BD5] bg-[#5B9BD5]/15"
          />
        )}
      </AnimatePresence>

      {/* Floating Damage / Finisher Popup */}
      <AnimatePresence>
        {(isEnemyHit || isEnemyGuard) && effect && (
          <motion.div
            key={`dmgpop_${effect.id}`}
            initial={{ opacity: 0, y: 8, scale: 0.65 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: compact ? [4, -14, -22] : [-4, -30, -44],
              scale: [0.65, 1.18, 1],
            }}
            transition={{
              duration: effect.isLethal ? 0.72 : 0.65,
              ease: "easeOut",
            }}
            className={`pointer-events-none absolute z-20 flex flex-col whitespace-nowrap ${
              compact
                ? "-top-2 left-0 items-start"
                : "-top-3 left-1/2 -translate-x-1/2 items-center"
            }`}
          >
            {effect.isLethal && (
              <span className="mb-0.5 border border-[#F4D06F] bg-[#C93A2B] px-1.5 py-0.5 font-serif text-[10px] font-extrabold tracking-widest text-[#F7F3EA] shadow">
                討伐！
              </span>
            )}
            {!effect.isLethal && effect.subLabel && (
              <span className="mb-0.5 border border-[#8A7348] bg-[#0B0A0E]/90 px-1 py-0.5 font-mono text-[9px] font-bold text-[#F4D06F]">
                {effect.subLabel}
              </span>
            )}
            <span
              style={{
                textShadow:
                  "0 2px 0 #0B0A0E, 1px 0 0 #0B0A0E, -1px 0 0 #0B0A0E, 0 -1px 0 #0B0A0E",
              }}
              className={`font-pixel font-bold tracking-wider ${
                compact ? "text-lg" : "text-2xl"
              } ${isEnemyGuard ? "text-[#69A3D9]" : effect.colorClass}`}
            >
              {isEnemyGuard ? `+${effect.amountText}` : `-${effect.amountText}`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PlayerStripOverlayProps {
  effect: CombatVisualEffect | null;
}

/**
 * Visual feedback overlay on the player status strip for guard, skill, and enemy attacks.
 */
export function PlayerStripOverlay({ effect }: PlayerStripOverlayProps) {
  const isPlayerRel =
    effect !== null &&
    (effect.kind === "guard" ||
      effect.kind === "skill" ||
      effect.kind === "enemy_attack" ||
      effect.kind === "enemy_blocked");

  const flashClass =
    effect?.kind === "guard" || effect?.kind === "enemy_blocked"
      ? "border-[#5B9BD5] bg-[#5B9BD5]/18"
      : effect?.kind === "enemy_attack"
        ? "border-[#E05A47] bg-[#C93A2B]/25"
        : "border-[#D4AF37] bg-[#D4AF37]/15";

  const textClass =
    effect?.kind === "guard" || effect?.kind === "enemy_blocked"
      ? "border-[#5B9BD5] bg-[#101C28]/95 text-[#89CFF0]"
      : effect?.kind === "enemy_attack"
        ? "border-[#E05A47] bg-[#261112]/95 text-[#F7B5AD]"
        : "border-[#D4AF37] bg-[#1E1910]/95 text-[#F4D06F]";

  return (
    <AnimatePresence>
      {isPlayerRel && effect && (
        <motion.div
          key={`pflash_${effect.id}`}
          initial={{ opacity: 0.95 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className={`pointer-events-none absolute inset-0 border-2 ${flashClass}`}
        />
      )}
      {isPlayerRel && effect && (
        <motion.div
          key={`ppop_${effect.id}`}
          initial={{ opacity: 0, y: 4, scale: 0.82 }}
          animate={{ opacity: [0, 1, 1, 0], y: [-2, -16, -24], scale: [0.82, 1.08, 1] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.62, ease: "easeOut" }}
          className={`pointer-events-none absolute -top-2.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap border px-2 py-0.5 font-mono text-[11px] font-bold shadow-lg ${textClass}`}
        >
          {effect.kind === "guard"
            ? `盾 +${effect.amountText}`
            : effect.kind === "enemy_attack"
              ? `被弾 -${effect.amountText}`
              : effect.kind === "enemy_blocked"
                ? "完全防御！"
                : effect.amountText}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
