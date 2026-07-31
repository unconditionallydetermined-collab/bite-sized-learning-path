import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronRight, LogOut, User } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings/")({
  head: () => ({
    meta: [
      { title: "Settings — BitQuest" },
      { name: "description", content: "Manage your BitQuest account, profile, and app preferences." },
      { property: "og:title", content: "Settings — BitQuest" },
      { property: "og:description", content: "Account and preference settings for your BitQuest path." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <AppShell>
      <h1 className="mb-5 text-2xl">Settings</h1>
      <div className="space-y-2">
        <Link
          to="/settings/profile"
          className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-4 transition-colors hover:bg-secondary/60"
        >
          <User className="size-4 text-primary" />
          <span className="flex-1 text-sm font-bold">Profile</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-4 opacity-60">
          <Bell className="size-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-bold">Reminders</span>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Soon</span>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-4 text-left transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-4 text-destructive" />
          <span className="flex-1 text-sm font-bold">Log out</span>
        </button>
      </div>
    </AppShell>
  );
}