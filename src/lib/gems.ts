import { supabase } from "@/integrations/supabase/client";

/**
 * Gems are the single currency. Rewards are deliberately unpredictable so each
 * completion feels like a small gamble instead of a fixed paycheck.
 */
export const CHEST_ODDS = 8; // ~1 in 8 completions opens a chest
export const FREEZE_COST = 200;
export const FREEZE_CAP = 2;

export type GemDrop = {
  amount: number;
  kind: "flat" | "chest" | "milestone";
};

function randomBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Reward for finishing a single lesson bit. */
export function rollBitReward(): GemDrop {
  if (randomBetween(1, CHEST_ODDS) === 1) {
    return { amount: randomBetween(50, 100), kind: "chest" };
  }
  return { amount: randomBetween(10, 40), kind: "flat" };
}

/** Guaranteed bigger chest on every 7th streak day. */
export function rollMilestoneChest(): GemDrop {
  return { amount: randomBetween(100, 150), kind: "milestone" };
}

export function isStreakMilestone(streak: number): boolean {
  return streak > 0 && streak % 7 === 0;
}

/** Credits gems and returns the new balance. */
export async function awardGems(userId: string, amount: number): Promise<number> {
  const { data } = await supabase.from("profiles").select("gems").eq("id", userId).maybeSingle();
  const next = Number(data?.gems ?? 0) + Math.max(0, Math.round(amount));
  await supabase.from("profiles").update({ gems: next }).eq("id", userId);
  return next;
}

/** Spends gems if the balance covers it. Returns false when it doesn't. */
export async function spendGems(userId: string, amount: number): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("gems").eq("id", userId).maybeSingle();
  const balance = Number(data?.gems ?? 0);
  if (balance < amount) return false;
  await supabase.from("profiles").update({ gems: balance - amount }).eq("id", userId);
  return true;
}

/** Buys one streak freeze (capped at FREEZE_CAP held). */
export async function buyStreakFreeze(userId: string): Promise<
  { ok: true } | { ok: false; reason: "capped" | "funds" }
> {
  const { data } = await supabase
    .from("profiles")
    .select("gems, streak_freezes")
    .eq("id", userId)
    .maybeSingle();
  const held = Number(data?.streak_freezes ?? 0);
  const gems = Number(data?.gems ?? 0);
  if (held >= FREEZE_CAP) return { ok: false, reason: "capped" };
  if (gems < FREEZE_COST) return { ok: false, reason: "funds" };
  await supabase
    .from("profiles")
    .update({ gems: gems - FREEZE_COST, streak_freezes: held + 1 })
    .eq("id", userId);
  return { ok: true };
}