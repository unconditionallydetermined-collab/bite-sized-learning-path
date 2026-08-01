import { createFileRoute } from "@tanstack/react-router";
import { Gem, Snowflake } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/hooks/useProfile";

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
  const { data: profile } = useProfile();

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
              Protects your streak for one missed day. Held: {profile?.streak_freezes ?? 0}/2
            </p>
          </div>
          <span className="rounded-full border-2 border-border px-3 py-1.5 text-xs font-extrabold text-primary">
            200
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Purchases go live with the gems economy step.
        </p>
      </div>
    </AppShell>
  );
}
