/**
 * Haptic feedback helpers. Vibration is a progressive enhancement: browsers
 * without the API (or desktop) silently no-op.
 */
type Pattern = "tap" | "success" | "chest" | "streak" | "complete";

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 12,
  success: [18, 40, 26],
  chest: [30, 60, 30, 60, 90],
  streak: [14, 40, 14, 40, 70],
  complete: [24, 50, 24, 50, 24, 50, 120],
};

export function haptic(pattern: Pattern = "tap") {
  if (typeof navigator === "undefined") return;
  const vibrate = navigator.vibrate?.bind(navigator);
  if (!vibrate) return;
  try {
    vibrate(PATTERNS[pattern]);
  } catch {
    /* ignore unsupported */
  }
}
