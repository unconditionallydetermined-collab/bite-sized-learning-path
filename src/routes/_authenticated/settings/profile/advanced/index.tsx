import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Database, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/settings/profile/advanced/")({
  head: () => ({
    meta: [
      { title: "Advanced options — BitQuest" },
      { name: "description", content: "Advanced BitQuest options including your content library." },
      { property: "og:title", content: "Advanced options — BitQuest" },
      { property: "og:description", content: "Deep settings for power users of BitQuest." },
    ],
  }),
  component: AdvancedPage,
});

function AdvancedPage() {
  return (
    <AppShell>
      <h1 className="mb-1 text-2xl">Advanced</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Power-user options. Changes here affect your whole path.
      </p>
      <div className="space-y-2">
        <Link
          to="/settings/profile/advanced/content-library"
          className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-4 transition-colors hover:bg-secondary/60"
        >
          <Database className="size-4 text-primary" />
          <span className="flex-1 text-sm font-bold">Content library</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-4 opacity-60">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-bold">Data export</span>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Soon</span>
        </div>
      </div>
    </AppShell>
  );
}