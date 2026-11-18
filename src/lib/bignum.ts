export interface FormattedBigNumber {
  text: string;
  tier: "normal" | "man" | "oku" | "cho" | "kei" | "gai" | "muryo";
  colorClass: string;
  shakeLevel: 0 | 1 | 2 | 3;
}

const JAPANESE_UNITS: {
  threshold: number;
  unit: string;
  tier: FormattedBigNumber["tier"];
}[] = [
  { threshold: 1e68, unit: "無量大数", tier: "muryo" },
  { threshold: 1e64, unit: "不可思議", tier: "muryo" },
  { threshold: 1e60, unit: "那由他", tier: "muryo" },
  { threshold: 1e56, unit: "阿僧祇", tier: "muryo" },
  { threshold: 1e52, unit: "恒河沙", tier: "gai" },
  { threshold: 1e48, unit: "極", tier: "gai" },
  { threshold: 1e44, unit: "載", tier: "gai" },
  { threshold: 1e40, unit: "正", tier: "gai" },
  { threshold: 1e36, unit: "澗", tier: "gai" },
  { threshold: 1e32, unit: "溝", tier: "gai" },
  { threshold: 1e28, unit: "穣", tier: "gai" },
  { threshold: 1e24, unit: "𥝱", tier: "gai" },
  { threshold: 1e20, unit: "垓", tier: "gai" },
  { threshold: 1e16, unit: "京", tier: "kei" },
  { threshold: 1e12, unit: "兆", tier: "cho" },
  { threshold: 1e8, unit: "億", tier: "oku" },
  { threshold: 1e4, unit: "万", tier: "man" },
];

export function formatJapaneseNumber(raw: number): FormattedBigNumber {
  if (Number.isNaN(raw)) {
    return {
      text: "0",
      tier: "normal",
      colorClass: "text-[#ECE6D8]",
      shakeLevel: 0,
    };
  }
  if (!Number.isFinite(raw)) {
    return {
      text: raw > 0 ? "Inf" : "0",
      tier: "muryo",
      colorClass: "text-[#C93A2B]",
      shakeLevel: 3,
    };
  }
  if (raw >= 1e72) {
    return {
      text: raw.toExponential(2).replace("+", ""),
      tier: "muryo",
      colorClass: "text-[#C93A2B]",
      shakeLevel: 3,
    };
  }

  const value = Math.max(0, Math.floor(raw));
  if (value < 10_000) {
    return {
      text: value.toLocaleString("ja-JP"),
      tier: "normal",
      colorClass: "text-[#ECE6D8]",
      shakeLevel: 0,
    };
  }

  for (const entry of JAPANESE_UNITS) {
    if (value >= entry.threshold) {
      const scaled = value / entry.threshold;
      const formatted =
        scaled >= 100
          ? Math.floor(scaled).toLocaleString("ja-JP")
          : scaled >= 10
            ? scaled.toFixed(1).replace(/\.0$/, "")
            : scaled.toFixed(2).replace(/\.00$/, "");

      const colorMap: Record<FormattedBigNumber["tier"], string> = {
        normal: "text-[#ECE6D8]",
        man: "text-[#E3B94E]",
        oku: "text-[#E88A38]",
        cho: "text-[#E05A47]",
        kei: "text-[#F07167]",
        gai: "text-[#F4D06F]",
        muryo: "text-[#C93A2B]",
      };
      const shakeMap: Record<FormattedBigNumber["tier"], 0 | 1 | 2 | 3> = {
        normal: 0,
        man: 0,
        oku: 1,
        cho: 1,
        kei: 2,
        gai: 2,
        muryo: 3,
      };
      return {
        text: `${formatted}${entry.unit}`,
        tier: entry.tier,
        colorClass: colorMap[entry.tier],
        shakeLevel: shakeMap[entry.tier],
      };
    }
  }

  return {
    text: value.toLocaleString("ja-JP"),
    tier: "normal",
    colorClass: "text-[#ECE6D8]",
    shakeLevel: 0,
  };
}

/** Deterministic 32-bit FNV-1a hash for consistent UR generation & daily seeds */
export function hashStringToSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Seeded PRNG (Mulberry32) */
export function createSeededRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function getTodayJstDateKey(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
