import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { findNextUp } from "@/components/LessonNodes";
import { useAuth } from "@/hooks/useAuth";
import { fetchPath } from "@/lib/course-data";

/**
 * Quick-action target for the home-screen icon long-press ("Start a lesson").
 * It skips the path screen entirely and jumps straight into the next bit.
 */
export const Route = createFileRoute("/_authenticated/start")({
  head: () => ({
    meta: [
      { title: "Start a lesson — BitQuest" },
      {
        name: "description",
        content: "Jump straight into your next BitQuest lesson bit without passing the home screen.",
      },
      { property: "og:title", content: "Start a lesson — BitQuest" },
      {
        property: "og:description",
        content: "The quick action that drops you directly into your next learning bit.",
      },
    ],
  }),
  component: StartPage,
});

function StartPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const navigate = useNavigate();

  const { data: modules, isLoading } = useQuery({
    queryKey: ["path", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchPath(userId),
  });

  useEffect(() => {
    if (isLoading || !modules) return;
    const next = findNextUp(modules);
    if (!next) {
      void navigate({ to: "/path", replace: true });
      return;
    }
    void navigate({
      to: "/learn/$unitId",
      params: { unitId: next.unit.id },
      search: { bit: next.bit },
      replace: true,
    });
  }, [isLoading, modules, navigate]);

  return (
    <AppShell>
      <div className="screen-in flex flex-col items-center gap-4 py-16 text-center">
        <Mascot mood="happy" size={120} className="drift" />
        <h1 className="text-2xl">Loading your next lesson…</h1>
        <p className="text-sm text-muted-foreground">Straight in — no detours.</p>
      </div>
    </AppShell>
  );
}
