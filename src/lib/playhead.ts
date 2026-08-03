/**
 * Remembers where each video was left off so playback resumes at the exact
 * position instead of restarting. Local to the device on purpose — it is a
 * convenience, not progress data.
 */
const KEY = "bitquest.playheads";

type Store = Record<string, number>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

export function getPlayhead(videoId: string): number {
  return read()[videoId] ?? 0;
}

export function setPlayhead(videoId: string, seconds: number) {
  if (typeof window === "undefined" || !videoId) return;
  const store = read();
  store[videoId] = Math.max(0, Math.round(seconds));
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage full or blocked */
  }
}

export function clearPlayhead(videoId: string) {
  if (typeof window === "undefined") return;
  const store = read();
  delete store[videoId];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}
