/**
 * Reduced-friction flow: after a few quick completions in a row we stop
 * throwing the full celebration screen at the learner and switch to a light
 * inline confirmation so momentum is not broken.
 */
const KEY = "bitquest.pace";
const WINDOW_MS = 12 * 60 * 1000;

type Pace = { count: number; last: number };

function read(): Pace {
  if (typeof window === "undefined") return { count: 0, last: 0 };
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Pace | null;
    if (!raw || Date.now() - raw.last > WINDOW_MS) return { count: 0, last: 0 };
    return raw;
  } catch {
    return { count: 0, last: 0 };
  }
}

function write(pace: Pace) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pace));
  } catch {
    /* ignore */
  }
}

/** Call on every completed bit. Returns the streak of quick completions. */
export function recordCompletion(): number {
  const pace = read();
  const next = { count: pace.count + 1, last: Date.now() };
  write(next);
  return next.count;
}

export function resetPace() {
  write({ count: 0, last: Date.now() });
}

/**
 * Full screen for the first few, and again on every 4th so the payoff still
 * lands. `available` (how much content is left) nudges the cadence: with lots
 * of lessons queued we stay in light mode longer.
 */
export function shouldShowFullCelebration(quickCount: number, available: number): boolean {
  if (quickCount <= 3) return true;
  const cadence = available > 12 ? 6 : 4;
  return quickCount % cadence === 0;
}
