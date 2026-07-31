import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Flame, Sliders } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings/profile/")({
  head: () => ({
    meta: [
      { title: "Profile — BitQuest" },
      { name: "description", content: "Your BitQuest profile, streak history, and advanced options." },
      { property: "og:title", content: "Profile — BitQuest" },
      { property: "og:description", content: "Review your streak stats and open advanced BitQuest options." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id ?? ""],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("streak_count, longest_streak, last_active_date")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  return (
    <AppShell streak={profile?.streak_count}>
      <h1 className="mb-1 text-2xl">Profile</h1>
      <p className="mb-5 text-sm text-muted-foreground">{user?.email}</p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Flame className="size-3.5" /> Streak
          </p>
          <p className="mt-1 font-display text-2xl">{profile?.streak_count ?? 0}</p>
        </div>
        <div className="rounded-2xl border-2 border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Longest</p>
          <p className="mt-1 font-display text-2xl">{profile?.longest_streak ?? 0}</p>
        </div>
      </div>

      <Link
        to="/settings/profile/advanced"
        className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-4 transition-colors hover:bg-secondary/60"
      >
        <Sliders className="size-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-bold">Advanced</span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </AppShell>
  );
}