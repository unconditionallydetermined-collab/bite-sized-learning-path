/**
 * Tiny WebAudio sound effects — synthesized, so there are no audio assets to
 * download and nothing to fail on slow connections.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(frequency: number, startAt: number, duration: number, gain = 0.14) {
  const context = audio();
  if (!context) return;
  const osc = context.createOscillator();
  const amp = context.createGain();
  osc.type = "triangle";
  osc.frequency.value = frequency;
  const t0 = context.currentTime + startAt;
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(context.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Rising arpeggio for the lesson-complete screen. */
export function playCompletionSfx() {
  [523.25, 659.25, 783.99, 1046.5].forEach((hz, index) => tone(hz, index * 0.09, 0.28));
}

/** Sparkly flourish for a chest reveal. */
export function playChestSfx() {
  [392, 523.25, 698.46, 880, 1174.66].forEach((hz, index) => tone(hz, index * 0.07, 0.22, 0.12));
}

/** Short warm blip for a streak extension. */
export function playStreakSfx() {
  [440, 587.33, 880].forEach((hz, index) => tone(hz, index * 0.1, 0.3, 0.12));
}
