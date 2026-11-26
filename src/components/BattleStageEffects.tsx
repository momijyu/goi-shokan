"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PixelMonster } from "@/components/PixelMonster";
import { ATTR_META, RANK_META, type Attribute, type Rank } from "@/types/game";

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
  cardTerm?: string;
  cardRank?: Rank;
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
  { x: -38, y: -28 },
  { x: 40, y: -24 },
  { x: -44, y: 20 },
  { x: 38, y: 28 },
  { x: 0, y: -46 },
  { x: 0, y: 42 },
  { x: -28, y: -44 },
  { x: 28, y: 40 },
];

const SPEED_LINE_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

/**
 * Dramatic card invocation overlay shown across the battle stage whenever a card is played.
 */
export function CardInvocationBanner({
  effect,
  compact = false,
}: {
  effect: CombatVisualEffect | null;
  compact?: boolean;
}) {
  const isCardAction =
    effect !== null &&
    Boolean(effect.cardTerm) &&
    (effect.kind === "attack" ||
      effect.kind === "pierce" ||
      effect.kind === "guard" ||
      effect.kind === "skill");

  const attrColor = effect?.attribute
    ? ATTR_META[effect.attribute].color
    : "#E3B94E";
  const rankMeta = effect?.cardRank ? RANK_META[effect.cardRank] : null;
  const actionLabel =
    effect?.kind === "pierce"
      ? "貫通一閃"
      : effect?.kind === "attack"
        ? effect.retriggers > 1
          ? `${effect.retriggers}連撃`
          : "言霊斬撃"
        : effect?.kind === "guard"
          ? "結界展開"
          : "秘術発動";

  return (
    <AnimatePresence>
      {isCardAction && effect && (
        <motion.div
          key={`invoke_${effect.id}`}
          initial={{ opacity: 0, x: -48, scale: 0.85 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: [-48, 0, 4, 28],
            scale: [0.85, 1.08, 1, 0.96],
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.62, ease: "easeOut" }}
          className={`pointer-events-none absolute inset-x-0 z-30 flex items-center justify-center ${
            compact ? "top-8" : "top-11"
          }`}
        >
          {/* Sweeping Horizontal Light Streak */}
          <motion.div
            initial={{ scaleX: 0.1, opacity: 0.85 }}
            animate={{ scaleX: 1.3, opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${attrColor}66 50%, transparent 100%)`,
            }}
            className="absolute h-7 w-full"
          />

          {/* Stylized Invocation Plaque */}
          <div
            style={{
              borderColor: attrColor,
              boxShadow: `0 0 20px ${attrColor}55, inset 0 0 12px ${attrColor}22`,
            }}
            className="relative flex items-center gap-2 border-y-2 border-x bg-[#0B0A0E]/95 px-3 py-1 backdrop-blur-[1px]"
          >
            {rankMeta && (
              <span
                style={{
                  color: rankMeta.color,
                  backgroundColor: rankMeta.bg,
                  borderColor: rankMeta.border,
                }}
                className="inline-flex h-5 w-5 items-center justify-center border font-serif text-[11px] font-extrabold"
              >
                {rankMeta.kanji}
              </span>
            )}
            <span className="font-serif text-xs font-extrabold tracking-wider text-[#F7F3EA] sm:text-sm">
              『{effect.cardTerm}』
            </span>
            <span
              style={{ color: attrColor }}
              className="border-l border-[#3A332A] pl-2 font-mono text-[10px] font-bold tracking-wider"
            >
              {actionLabel}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
            {/* Radial Speed Lines (集中線) for big hits or lethal */}
            {(effect.shakeLevel >= 1 || effect.isLethal) && (
              <svg
                viewBox="-60 -60 120 120"
                className="pointer-events-none absolute -inset-[35%] h-[170%] w-[170%] overflow-visible"
              >
                {SPEED_LINE_ANGLES.map((deg, idx) => (
                  <motion.line
                    key={deg}
                    x1="24"
                    y1="0"
                    x2={effect.isLethal || effect.shakeLevel >= 2 ? "58" : "46"}
                    y2="0"
                    stroke={idx % 2 === 0 ? "#F4D06F" : hitAttrColor}
                    strokeWidth={effect.isLethal || effect.shakeLevel >= 2 ? "2.4" : "1.6"}
                    transform={`rotate(${deg})`}
                    initial={{ opacity: 0.95, pathLength: 0 }}
                    animate={{ opacity: [0.95, 0.95, 0], pathLength: 1 }}
                    transition={{ duration: 0.34, delay: idx * 0.01, ease: "easeOut" }}
                  />
                ))}
              </svg>
            )}

            {/* Expanding Shockwave Ring */}
            <motion.div
              initial={{ scale: 0.35, opacity: 0.95 }}
              animate={{ scale: effect.isLethal ? 1.75 : 1.25 + effect.shakeLevel * 0.14, opacity: 0 }}
              transition={{ duration: 0.42, ease: "easeOut" }}
              style={{ borderColor: hitAttrColor }}
              className="absolute inset-[8%] rounded-full border-2"
            />
            {(effect.shakeLevel >= 2 || effect.isLethal) && (
              <motion.div
                initial={{ scale: 0.25, opacity: 0.9 }}
                animate={{ scale: 2.05, opacity: 0 }}
                transition={{ duration: 0.52, delay: 0.06, ease: "easeOut" }}
                className="absolute inset-[12%] rounded-full border-2 border-[#F4D06F]"
              />
            )}

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
            {SPARK_OFFSETS.slice(
              0,
              effect.shakeLevel >= 2 || effect.isLethal ? 8 : 5
            ).map(
              (offset, idx) => (
                <motion.span
                  key={`${offset.x}_${offset.y}`}
                  initial={{ x: 0, y: 0, scale: 1.35, opacity: 1 }}
                  animate={{
                    x: offset.x * (compact ? 0.8 : 1.15),
                    y: offset.y * (compact ? 0.8 : 1.15),
                    scale: 0.15,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.42, delay: idx * 0.018, ease: "easeOut" }}
                  style={{
                    backgroundColor: idx % 2 === 0 ? "#F4D06F" : hitAttrColor,
                  }}
                  className="absolute h-2 w-2"
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
            initial={{ opacity: 0, y: 8, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: compact ? [4, -14, -22] : [-4, -30, -46],
              scale:
                effect.shakeLevel >= 2 || effect.isLethal
                  ? [0.6, 1.32, 1.08]
                  : [0.65, 1.18, 1],
            }}
            transition={{
              duration: effect.isLethal || effect.shakeLevel >= 2 ? 0.82 : 0.65,
              ease: "easeOut",
            }}
            className={`pointer-events-none absolute z-20 flex flex-col whitespace-nowrap ${
              compact
                ? "-top-2 left-0 items-start"
                : "-top-3 left-1/2 -translate-x-1/2 items-center"
            }`}
          >
            {effect.isLethal && (
              <motion.span
                initial={{ scale: 2.5, opacity: 0, rotate: -14 }}
                animate={{ scale: [2.5, 0.94, 1], opacity: 1, rotate: -5 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="mb-1 border-2 border-[#F4D06F] bg-[#C93A2B] px-2.5 py-0.5 font-serif text-xs font-extrabold tracking-[0.2em] text-[#F7F3EA] shadow-[0_0_16px_rgba(201,58,43,0.85)]"
              >
                討伐！
              </motion.span>
            )}
            {!effect.isLethal && effect.subLabel && (
              <span className="mb-0.5 border border-[#8A7348] bg-[#0B0A0E]/90 px-1 py-0.5 font-mono text-[9px] font-bold text-[#F4D06F]">
                {effect.subLabel}
              </span>
            )}
            <span
              style={{
                textShadow:
                  effect.shakeLevel >= 2 || effect.isLethal
                    ? "0 3px 0 #0B0A0E, 0 0 18px rgba(244,208,111,0.75), 1px 0 0 #0B0A0E, -1px 0 0 #0B0A0E"
                    : "0 2px 0 #0B0A0E, 1px 0 0 #0B0A0E, -1px 0 0 #0B0A0E, 0 -1px 0 #0B0A0E",
              }}
              className={`font-pixel font-bold tracking-wider ${
                effect.shakeLevel >= 2 || effect.isLethal
                  ? compact
                    ? "text-2xl"
                    : "text-3xl sm:text-4xl"
                  : effect.shakeLevel === 1
                    ? compact
                      ? "text-xl"
                      : "text-2xl sm:text-3xl"
                    : compact
                      ? "text-lg"
                      : "text-2xl"
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
