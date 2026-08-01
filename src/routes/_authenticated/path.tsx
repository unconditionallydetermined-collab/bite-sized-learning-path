import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Play, Search, Shuffle, SkipForward } from "lucide-react";
import { toast } from "sonner";

import { AppShell, EmptyPath } from "@/components/AppShell";
import { BitLessonTrail, NextUpCard, findNextUp } from "@/components/LessonNodes";
import { Mascot } from "@/components/Mascot";
import { SkipModal } from "@/components/SkipModal";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { fetchPath, touchStreak } from "@/lib/course-data";

export const Route = createFileRoute("/_authenticated/path")({
  head: () => ({
    meta: [
      { title: "Your quest path — BitQuest" },
      {
        name: "description",
        content:
          "Climb your vertical quest path and finish 60-90 second learning bits to keep your streak.",
      },
      { property: "og:title", content: "Your quest path — BitQuest" },
      {
        property: "og:description",
        content: "A Duolingo-style path of micro-learning quests built from your own video course.",
      },
    ],
  }),
  component: PathPage,
});

function PathPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);
  const [skipTarget, setSkipTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["path", userId],
    queryFn: () => fetchPath(userId),
    enabled: Boolean(userId),
  });

  const { data: profile } = useProfile();

  useEffect(() => {
    if (!userId) return;
    void touchStreak(userId).then(() =>
      queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
    );
  }, [userId, queryClient]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return modules;
    return modules.filter(
      (module) =>
        module.title.toLowerCase().includes(term) ||
        module.units.some((unit) => unit.title.toLowerCase().includes(term)),
    );
  }, [modules, query]);

  const confirmSkip = async () => {
    if (!skipTarget) return;
    const { error } = await supabase
      .from("module_progress")
      .upsert(
        { user_id: userId, module_id: skipTarget.id, status: "skipped" },
        { onConflict: "user_id,module_id" },
      );
    if (error) toast.error(error.message);
    else toast("Module skipped. The gap stays on your path.");
    setSkipTarget(null);
    void queryClient.invalidateQueries({ queryKey: ["path", userId] });
  };

  const completedCount = modules.filter((module) => module.status === "completed").length;
  const nextUp = useMemo(() => findNextUp(modules), [modules]);

  // Open the module holding the current bit as soon as the path loads.
  useEffect(() => {
    if (autoOpened || !nextUp) return;
    setOpenId(nextUp.module.id);
    setAutoOpened(true);
  }, [autoOpened, nextUp]);

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-3 rounded-3xl border-2 border-border bg-card p-4 shadow-chunky-sm">
        <Mascot mood={nextUp ? "neutral" : "happy"} size={72} />
        <div className="min-w-0">
          <p className="font-display text-base">
            {nextUp ? "Ready for one bit?" : "Path clear — nice work!"}
          </p>
          <p className="text-xs text-muted-foreground">
            {profile?.streak_count ?? 0} day streak · {profile?.gems ?? 0} gems
          </p>
        </div>
      </div>
      {nextUp && <NextUpCard next={nextUp} />}
      <div className="mb-5">
        <h1 className="text-2xl">Your quest path</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {completedCount}/{modules.length} modules complete · longest streak{" "}
          {profile?.longest_streak ?? 0} days
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search modules or units"
          className="w-full rounded-2xl border-2 border-input bg-card py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-ring"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your path…</p>
      ) : modules.length === 0 ? (
        <EmptyPath />
      ) : (
        <ol className="relative space-y-4 pl-8">
          <span className="absolute left-3 top-2 bottom-2 w-1.5 rounded-full bg-track" aria-hidden />
          {visible.map((module, index) => {
            const open = openId === module.id;
            return (
              <li key={module.id} className="relative">
                <span
                  aria-hidden
                  className={`absolute -left-8 top-5 flex size-7 items-center justify-center rounded-full border-2 border-card text-[11px] font-extrabold ${
                    module.status === "completed"
                      ? "bg-primary text-primary-foreground node-pop"
                      : module.status === "skipped"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-gold text-gold-foreground"
                  }`}
                >
                  {module.status === "completed" ? <Check className="size-4" /> : index + 1}
                </span>

                <div className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-chunky-sm transition-all">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : module.id)}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        {module.isMixed && <Shuffle className="size-3.5 text-sky" />}
                        <span className="font-display text-base">{module.title}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {module.units.length} unit(s) ·{" "}
                        {module.status === "skipped" ? "skipped" : module.status}
                      </span>
                    </span>
                    <ChevronDown
                      className={`size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-2 border-t-2 border-border px-4 py-3">
                        {module.units.map((unit) => (
                          <div
                            key={unit.id}
                            className="flex items-start gap-3 rounded-2xl bg-secondary/60 px-3 py-2.5"
                          >
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold">{unit.title}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {unit.questTitle} ·{" "}
                                    {unit.completed
                                      ? "unit complete"
                                      : `${unit.bitsDone.length} lesson(s) done`}
                                  </p>
                                </div>
                                <Link
                                  to="/learn/$unitId"
                                  params={{ unitId: unit.id }}
                                  search={{}}
                                  className="btn-chunky flex items-center gap-1.5 bg-primary px-3 py-2 text-[11px] text-primary-foreground"
                                >
                                  <Play className="size-3.5" />
                                  {unit.bitsDone.length > 0 ? "Resume" : "Start"}
                                </Link>
                              </div>
                              <BitLessonTrail unit={unit} />
                            </div>
                          </div>
                        ))}

                        {module.status !== "skipped" && (
                          <button
                            type="button"
                            onClick={() => setSkipTarget({ id: module.id, title: module.title })}
                            className="flex items-center gap-1.5 pt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <SkipForward className="size-3.5" /> Skip this module
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {skipTarget && (
        <SkipModal
          moduleTitle={skipTarget.title}
          onClose={() => setSkipTarget(null)}
          onConfirm={confirmSkip}
        />
      )}
    </AppShell>
  );
}