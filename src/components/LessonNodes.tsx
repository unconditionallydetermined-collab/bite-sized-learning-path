import { Link } from "@tanstack/react-router";
import { Check, Lock, Play, Star } from "lucide-react";

import { haptic } from "@/lib/haptics";
import type { PathModule } from "@/lib/course-data";

type Unit = PathModule["units"][number];

/** Smallest bit index the learner has not finished yet. */
export function nextBitIndex(bitsDone: number[]): number {
  let index = 0;
  const done = new Set(bitsDone);
  while (done.has(index)) index += 1;
  return index;
}

/** How many lesson nodes to render before the real video duration is known. */
function visibleBitCount(unit: Unit): number {
  if (unit.completed) return Math.max(unit.bitsDone.length, 1);
  return Math.max(unit.bitsDone.length + 4, 5);
}

export type NextUp = { module: PathModule; unit: Unit; bit: number };

/** First unfinished bit across the whole path — what the app opens on. */
export function findNextUp(modules: PathModule[]): NextUp | null {
  for (const module of modules) {
    if (module.status !== "active") continue;
    for (const unit of module.units) {
      if (unit.completed) continue;
      return { module, unit, bit: nextBitIndex(unit.bitsDone) };
    }
  }
  return null;
}

/** Horizontal row of Duolingo-style lesson circles, one per bit. */
export function BitLessonTrail({ unit }: { unit: Unit }) {
  const total = visibleBitCount(unit);
  const current = unit.completed ? -1 : nextBitIndex(unit.bitsDone);

  return (
    <div className="flex flex-wrap gap-3 pt-1">
      {Array.from({ length: total }, (_, index) => {
        const done = unit.completed || unit.bitsDone.includes(index);
        const isCurrent = index === current;
        const locked = !done && !isCurrent;

        const circle = (
          <span
            className={`flex size-12 items-center justify-center rounded-full border-2 border-border text-xs font-extrabold transition-transform ${
              done
                ? "bg-primary text-primary-foreground shadow-chunky-sm"
                : isCurrent
                  ? "node-halo bg-gold text-gold-foreground shadow-chunky-sm"
                  : "bg-muted text-muted-foreground"
            } ${locked ? "" : "hover:scale-105"}`}
          >
            {done ? (
              <Check className="size-5" />
            ) : isCurrent ? (
              <Play className="size-5" />
            ) : (
              <Lock className="size-4" />
            )}
          </span>
        );

        return (
          <div
            key={index}
            className="rise-in flex w-14 flex-col items-center gap-1"
            style={{ animationDelay: `${index * 45}ms` }}
          >
            {locked ? (
              circle
            ) : (
              <Link
                to="/learn/$unitId"
                params={{ unitId: unit.id }}
                search={{ bit: index }}
                aria-label={`Lesson ${index + 1}`}
              >
                {circle}
              </Link>
            )}
            {/* Bit length is intentionally hidden here to keep the path uncluttered. */}
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {isCurrent ? "Now" : `${index + 1}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * "Continue here" card. `compact` renders the thumb-zone variant that the path
 * screen pins to the lower half of the display.
 */
export function NextUpCard({ next, compact = false }: { next: NextUp; compact?: boolean }) {
  const cta = (
    <Link
      to="/learn/$unitId"
      params={{ unitId: next.unit.id }}
      search={{ bit: next.bit }}
      onClick={() => haptic("tap")}
      className={`btn-chunky inline-flex items-center gap-2 bg-primary text-primary-foreground ${
        compact ? "px-4 py-3 text-sm" : "mt-4 px-5 py-3 text-sm"
      }`}
    >
      <Play className="size-4" /> {next.unit.bitsDone.length > 0 ? "Continue" : "Start"}
    </Link>
  );

  if (compact) {
    return (
      <div className="rise-in flex items-center gap-3 rounded-2xl border-2 border-border bg-gradient-to-r from-primary/20 via-card to-gold/20 px-3 py-2.5 shadow-chunky-sm">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm">
            Lesson {next.bit + 1} · {next.unit.title}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">{next.module.title}</span>
        </span>
        {cta}
      </div>
    );
  }

  return (
    <div className="rise-in mb-6 rounded-3xl border-2 border-border bg-gradient-to-br from-primary/15 via-card to-gold/20 p-5 shadow-chunky">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
        <Star className="size-3.5 text-gold" /> Continue where you left off
      </p>
      <h2 className="mt-2 text-xl">
        Lesson {next.bit + 1} · {next.unit.title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{next.module.title}</p>
      {cta}
    </div>
  );
}
