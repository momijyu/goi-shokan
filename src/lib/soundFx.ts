"use client";

import type { Rank } from "@/types/game";

const MUTE_STORAGE_KEY = "goi_shokan_sound_muted_v1";

let audioCtx: AudioContext | null = null;
const soundListeners = new Set<() => void>();
let cachedMuted: boolean | undefined;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundMuted(): boolean {
  if (cachedMuted !== undefined) return cachedMuted;
  if (typeof window === "undefined") return false;
  try {
    cachedMuted = window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    cachedMuted = false;
  }
  return cachedMuted;
}

export function setSoundMuted(muted: boolean): void {
  cachedMuted = muted;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
    } catch {
      // Ignore storage failures
    }
  }
  soundListeners.forEach((l) => l());
}

export function toggleSoundMuted(): boolean {
  const next = !isSoundMuted();
  setSoundMuted(next);
  return next;
}

export function subscribeSoundMute(listener: () => void): () => void {
  soundListeners.add(listener);
  return () => soundListeners.delete(listener);
}

function playTone(
  ctx: AudioContext,
  freqStart: number,
  freqEnd: number,
  durationSec: number,
  type: OscillatorType,
  gainPeak: number,
  delaySec = 0
): void {
  const now = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, freqStart), now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + durationSec);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

function playNoiseBurst(
  ctx: AudioContext,
  durationSec: number,
  gainPeak: number,
  filterFreq: number,
  delaySec = 0
): void {
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  filter.Q.value = 1.4;

  const now = ctx.currentTime + delaySec;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainPeak, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
  source.stop(now + durationSec + 0.02);
}

export function playMiningStartSound(): void {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 330, 520, 0.14, "triangle", 0.08, 0);
    playTone(ctx, 440, 680, 0.16, "sine", 0.07, 0.06);
  } catch {
    // Ignore audio errors
  }
}

export function playMiningRevealSound(topRank: Rank): void {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (topRank === "UR") {
      playNoiseBurst(ctx, 0.14, 0.09, 2400, 0);
      playTone(ctx, 220, 440, 0.28, "sawtooth", 0.06, 0);
      playTone(ctx, 523.25, 1046.5, 0.34, "triangle", 0.1, 0.05);
      playTone(ctx, 659.25, 1318.5, 0.36, "sine", 0.09, 0.11);
      playTone(ctx, 783.99, 1567.98, 0.42, "sine", 0.09, 0.18);
    } else if (topRank === "SSR") {
      playTone(ctx, 440, 880, 0.24, "triangle", 0.09, 0);
      playTone(ctx, 587.33, 1174.66, 0.28, "sine", 0.08, 0.07);
      playTone(ctx, 880, 1318.5, 0.32, "sine", 0.07, 0.14);
    } else if (topRank === "F") {
      playTone(ctx, 210, 110, 0.22, "sawtooth", 0.07, 0);
      playTone(ctx, 198, 95, 0.24, "square", 0.05, 0.06);
    } else {
      playTone(ctx, 392, 587.33, 0.16, "triangle", 0.07, 0);
      playTone(ctx, 523.25, 783.99, 0.18, "sine", 0.06, 0.06);
    }
  } catch {
    // Ignore audio errors
  }
}

export function playCombatSound(params: {
  kind:
    | "attack"
    | "pierce"
    | "guard"
    | "skill"
    | "enemy_attack"
    | "enemy_blocked"
    | "enemy_guard";
  shakeLevel: 0 | 1 | 2 | 3;
  retriggers?: number;
  isLethal?: boolean;
}): void {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (params.kind === "attack" || params.kind === "pierce") {
      const hits = Math.min(4, Math.max(1, params.retriggers ?? 1));
      for (let i = 0; i < hits; i++) {
        const d = i * 0.06;
        playNoiseBurst(
          ctx,
          params.kind === "pierce" ? 0.11 : 0.08,
          0.08 + params.shakeLevel * 0.02,
          params.kind === "pierce" ? 2800 : 1800,
          d
        );
        playTone(
          ctx,
          params.kind === "pierce" ? 720 : 320,
          90,
          0.12 + params.shakeLevel * 0.03,
          "sawtooth",
          0.06 + params.shakeLevel * 0.015,
          d
        );
      }
      if (params.shakeLevel >= 2 || params.isLethal) {
        playTone(ctx, 150, 48, 0.34, "triangle", 0.14, 0.03);
      }
      if (params.isLethal) {
        playTone(ctx, 523.25, 1046.5, 0.28, "triangle", 0.09, 0.14);
      }
    } else if (params.kind === "guard" || params.kind === "enemy_blocked") {
      playTone(ctx, 440, 660, 0.16, "sine", 0.08, 0);
      playTone(ctx, 660, 880, 0.18, "triangle", 0.06, 0.05);
    } else if (params.kind === "skill") {
      playTone(ctx, 587.33, 987.77, 0.18, "sine", 0.07, 0);
      playTone(ctx, 783.99, 1174.66, 0.2, "triangle", 0.06, 0.05);
    } else if (params.kind === "enemy_attack") {
      playNoiseBurst(ctx, 0.12, 0.1, 700, 0);
      playTone(ctx, 160, 62, 0.2, "sawtooth", 0.1, 0);
    } else if (params.kind === "enemy_guard") {
      playTone(ctx, 260, 390, 0.18, "triangle", 0.07, 0);
    }
  } catch {
    // Ignore audio errors
  }
}
