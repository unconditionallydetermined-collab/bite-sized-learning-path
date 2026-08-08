/**
 * Crash-safe bit completion.
 *
 * The moment a bit reaches its end we write the completion to localStorage
 * synchronously, before any network call. If the learner backgrounds the app,
 * kills it, or loses the tab mid-reward, the next launch flushes the queue to
 * the database so the bit is never "watched but not recorded".
 */
import { supabase } from "@/integrations/supabase/client";

const KEY = "bitquest:pending-bits";

export type PendingBit = { unitId: string; bitIndex: number; seconds: number };

function read(): PendingBit[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as PendingBit[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(rows: PendingBit[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(rows.slice(-200)));
  } catch {
    /* best effort */
  }
}

/** Synchronous — safe to call from a pagehide/visibilitychange handler. */
export function markBitPending(unitId: string, bitIndex: number, seconds: number): void {
  const rows = read();
  if (rows.some((row) => row.unitId === unitId && row.bitIndex === bitIndex)) return;
  rows.push({ unitId, bitIndex, seconds: Math.round(seconds) });
  write(rows);
}

export function pendingBitsFor(unitId: string): number[] {
  return read()
    .filter((row) => row.unitId === unitId)
    .map((row) => row.bitIndex);
}

/** Pushes everything queued locally into the database, then clears the queue. */
export async function flushPendingBits(userId: string): Promise<number> {
  const rows = read();
  if (!userId || rows.length === 0) return 0;
  const { error } = await supabase.from("bit_progress").upsert(
    rows.map((row) => ({
      user_id: userId,
      unit_id: row.unitId,
      bit_index: row.bitIndex,
      bit_seconds: row.seconds,
    })),
    { onConflict: "user_id,unit_id,bit_index" },
  );
  if (error) return 0;
  write([]);
  return rows.length;
}
