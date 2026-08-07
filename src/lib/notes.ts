/**
 * Lesson notes: purely local, per-lesson scratchpad.
 *
 * Nothing here ever reaches the network — notes live in localStorage keyed by
 * the video plus the bit index so each lesson keeps its own page.
 */
const PREFIX = "bitquest:notes:";

function key(videoId: string, bitIndex: number | null | undefined): string {
  return `${PREFIX}${videoId}:${bitIndex ?? 0}`;
}

export function loadNote(videoId: string, bitIndex?: number | null): string {
  if (typeof localStorage === "undefined" || !videoId) return "";
  try {
    return localStorage.getItem(key(videoId, bitIndex)) ?? "";
  } catch {
    return "";
  }
}

export function saveNote(videoId: string, bitIndex: number | null | undefined, text: string): void {
  if (typeof localStorage === "undefined" || !videoId) return;
  try {
    if (text.trim() === "") localStorage.removeItem(key(videoId, bitIndex));
    else localStorage.setItem(key(videoId, bitIndex), text);
  } catch {
    /* storage full or blocked — notes are best-effort */
  }
}
