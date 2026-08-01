import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type LearnerProfile = {
  streak_count: number;
  longest_streak: number;
  gems: number;
  streak_freezes: number;
  onboarded: boolean;
};

/**
 * Single source of truth for header stats (streak + gems) so every screen —
 * including the lesson player — reads the same live values.
 */
export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<LearnerProfile | null> => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (!data) return null;
      const row = data as Record<string, unknown>;
      return {
        streak_count: Number(row["streak_count"] ?? 0),
        longest_streak: Number(row["longest_streak"] ?? 0),
        gems: Number(row["gems"] ?? 0),
        streak_freezes: Number(row["streak_freezes"] ?? 0),
        onboarded: Boolean(row["onboarded"]),
      };
    },
  });
}
