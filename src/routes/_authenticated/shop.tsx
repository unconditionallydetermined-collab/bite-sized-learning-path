import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Gem, Snowflake } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { FREEZE_CAP, FREEZE_COST, buyStreakFreeze } from "@/lib/gems";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({
    meta: [
      { title: "Gem shop — BitQuest" },
      {
        name: "description",
        content: "Spend the gems you earn from lesson bits on streak freezes and song unlocks.",
      },
      { property: "og:title", content: "Gem shop — BitQuest" },
      { property: "og:description", content: "Streak freezes and song unlocks, paid for in gems." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const buy = async () => {
    const result = await buyStreakFreeze(userId);
    if (!result.ok) {
      toast.error(
        result.reason === "capped"
          ? `You already hold ${FREEZE_CAP} streak freezes.`
          : "Not enough gems yet.",
      );
      return;
    }
    toast.success("Streak freeze added. It auto-applies on your next missed day.");
    await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
  };

  return (
    <AppShell>
      <h1 className="text-2xl">Gem shop</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Gem className="size-4 text-primary" /> {profile?.gems ?? 0} gems available
      </p>

      <div className="mt-6 rounded-3xl border-2 border-border bg-card p-5 shadow-chunky-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-sky/15 text-sky">
            <Snowflake className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base">Streak freeze</h2>
            <p className="text-xs text-muted-foreground">
              Protects your streak for one missed day. Held: {profile?.streak_freezes ?? 0}/
              {FREEZE_CAP}
            </p>
          </div>
          <span className="rounded-full border-2 border-border px-3 py-1.5 text-xs font-extrabold text-primary">
            {FREEZE_COST}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void buy()}
          disabled={(profile?.streak_freezes ?? 0) >= FREEZE_CAP}
          className="btn-chunky mt-4 flex items-center gap-2 bg-primary px-4 py-3 text-sm text-primary-foreground"
        >
          <Gem className="size-4" /> Buy for {FREEZE_COST} gems
        </button>
      </div>
    </AppShell>
  );
}
