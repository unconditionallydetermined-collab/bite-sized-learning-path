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

/**
 * Escalating streak commitment milestones. Payouts stay randomized inside a
 * range at every tier so the reward keeps its variable feel.
 */
export const STREAK_MILESTONES: Array<{ day: number; min: number; max: number; label: string }> = [
  { day: 3, min: 60, max: 110, label: "3-day spark" },
  { day: 7, min: 100, max: 150, label: "1-week commitment" },
  { day: 14, min: 160, max: 240, label: "2-week commitment" },
  { day: 30, min: 300, max: 450, label: "1-month commitment" },
  { day: 40, min: 420, max: 600, label: "40-day commitment" },
  { day: 60, min: 600, max: 850, label: "2-month commitment" },
  { day: 100, min: 900, max: 1300, label: "100-day legend" },
  { day: 180, min: 1500, max: 2100, label: "half-year legend" },
  { day: 365, min: 3000, max: 4200, label: "1-year legend" },
];

export function streakMilestone(streak: number) {
  return STREAK_MILESTONES.find((entry) => entry.day === streak) ?? null;
}

export function isStreakMilestone(streak: number): boolean {
  return streakMilestone(streak) !== null;
}

/** Guaranteed bigger chest whenever a milestone day lands. */
export function rollMilestoneChest(streak = 7): GemDrop {
  const tier = streakMilestone(streak) ?? { min: 100, max: 150 };
  return { amount: randomBetween(tier.min, tier.max), kind: "milestone" };
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