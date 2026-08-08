/**
 * Micro-learning "bit" sizing.
 *
 * Bits are 60-90 seconds of actionable content. Between 11:50 PM and 12:00 AM
 * local system time, bits shrink to exactly 30 seconds.
 */
export const LATE_NIGHT_BIT_SECONDS = 30;
export const MIN_BIT_SECONDS = 60;
export const MAX_BIT_SECONDS = 90;
/**
 * A trailing sliver shorter than this is folded into the previous bit. Short
 * tails were unreliable to detect as "finished", which left a module showing a
 * phantom incomplete bit, so no bit is ever this short.
 */
export const MIN_TAIL_SECONDS = 40;

export function isLateNightWindow(now: Date = new Date()): boolean {
  return now.getHours() === 23 && now.getMinutes() >= 50;
}

/** Deterministic per-index size so a unit's bit layout is stable across reloads. */
export function bitSecondsForIndex(index: number, now: Date = new Date()): number {
  if (isLateNightWindow(now)) return LATE_NIGHT_BIT_SECONDS;
  const span = MAX_BIT_SECONDS - MIN_BIT_SECONDS + 1;
  return MIN_BIT_SECONDS + ((index * 17 + 5) % span);
}

export type Bit = { index: number; start: number; end: number; seconds: number };

/** Splits a video duration into sequential bits. */
export function buildBits(durationSeconds: number, now: Date = new Date()): Bit[] {
  const duration = Math.max(1, Math.floor(durationSeconds));
  const bits: Bit[] = [];
  let start = 0;
  let index = 0;

  while (start < duration && index < 400) {
    const planned = bitSecondsForIndex(index, now);
    let end = Math.min(duration, start + planned);
    // Absorb a stubby final bit (never leave a tail under ~40s).
    if (duration - end < Math.min(MIN_TAIL_SECONDS, planned)) end = duration;
    bits.push({ index, start, end, seconds: end - start });
    start = end;
    index += 1;
  }

  return bits.length > 0 ? bits : [{ index: 0, start: 0, end: duration, seconds: duration }];
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}