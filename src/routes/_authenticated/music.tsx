import { createFileRoute } from "@tanstack/react-router";
import { Music } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";

export const Route = createFileRoute("/_authenticated/music")({
  head: () => ({
    meta: [
      { title: "Jukebox — BitQuest" },
      {
        name: "description",
        content: "Your unlocked songs and saved-for-later queue, earned with gems from lessons.",
      },
      { property: "og:title", content: "Jukebox — BitQuest" },
      { property: "og:description", content: "Spend gems to unlock songs after finishing lessons." },
    ],
  }),
  component: MusicPage,
});

function MusicPage() {
  return (
    <AppShell>
      <h1 className="text-2xl">Jukebox</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Songs you unlock with gems land here, plus anything you save for the gym.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border bg-card p-8 text-center">
        <Mascot mood="neutral" size={96} />
        <Music className="size-6 text-primary" />
        <p className="text-sm text-muted-foreground">
          Your queue is empty. Finish a lesson to get a song offer.
        </p>
      </div>
    </AppShell>
  );
}
