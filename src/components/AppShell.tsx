import { Link } from "@tanstack/react-router";
import { Flame, Settings, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({
  streak,
  children,
}: {
  streak?: number | null | undefined;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b-2 border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/path" className="flex items-center gap-2">
            <img src="/images/icon-512.png" alt="BitQuest" width={32} height={32} className="rounded-lg" />
            <span className="font-display text-lg">BitQuest</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border-2 border-border bg-gold/25 px-3 py-1.5 text-sm font-extrabold text-gold-foreground">
              <Flame className="size-4" /> {streak ?? 0}
            </span>
            <Link
              to="/settings"
              aria-label="Settings"
              className="rounded-full border-2 border-border p-2 text-muted-foreground transition-colors hover:text-primary"
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}

export function EmptyPath() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-card p-8 text-center">
      <Sparkles className="mx-auto size-8 text-primary" />
      <h2 className="mt-3 text-xl">No quests yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste your course text to build your learning path.
      </p>
      <Link
        to="/onboarding"
        className="btn-chunky mt-5 inline-block bg-primary px-5 py-3 text-sm text-primary-foreground"
      >
        Add course text
      </Link>
    </div>
  );
}