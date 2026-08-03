import { useEffect, useState } from "react";
import { Gem, Sparkles } from "lucide-react";

import { Mascot } from "@/components/Mascot";
import { haptic } from "@/lib/haptics";
import { playChestSfx, playCompletionSfx } from "@/lib/sfx";
import type { GemDrop } from "@/lib/gems";

/** Counts a number up from 0 for the celebration summary. */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) return;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

/** Small "+N" floaty shown in-flow whenever gems land. */
export function GemFloat({ amount }: { amount: number }) {
  return (
    <span className="gem-float pointer-events-none flex items-center gap-1 text-sm font-extrabold text-primary">
      <Gem className="size-4" /> +{amount}
    </span>
  );
}

/** Chest reveal: shake -> glow -> burst, then the payout. */
export function ChestReveal({ drop, onDone }: { drop: GemDrop; onDone: () => void }) {
  const [phase, setPhase] = useState<"shake" | "burst">("shake");

  useEffect(() => {
    haptic("chest");
    playChestSfx();
    const timer = window.setTimeout(() => setPhase("burst"), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-foreground/90 p-6 text-center">
      <div className={phase === "shake" ? "chest-shake" : "chest-burst"}>
        <span className="flex size-28 items-center justify-center rounded-3xl border-4 border-gold bg-gold/25 text-gold chest-glow">
          <Sparkles className="size-14" />
        </span>
      </div>
      {phase === "burst" && (
        <div className="rise-in space-y-3">
          <p className="font-display text-3xl text-background">
            +{drop.amount} gems
          </p>
          <p className="text-xs font-bold uppercase tracking-widest text-background/70">
            {drop.kind === "milestone" ? "Streak milestone chest" : "Lucky chest"}
          </p>
          <button
            type="button"
            onClick={() => {
              haptic("success");
              onDone();
            }}
            className="btn-chunky bg-primary px-6 py-3 text-sm text-primary-foreground"
          >
            Collect
          </button>
        </div>
      )}
    </div>
  );
}

/** End-of-video payoff: confetti + mascot + run summary. */
export function CompletionCelebration({
  gems,
  bits,
  streak,
  onContinue,
  onReplay,
  onExit,
}: {
  gems: number;
  bits: number;
  streak: number;
  onContinue: () => void;
  onReplay: () => void;
  onExit: () => void;
}) {
  const countedGems = useCountUp(gems);

  useEffect(() => {
    haptic("complete");
    playCompletionSfx();
  }, []);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 overflow-hidden bg-foreground/92 p-6 text-center">
      {Array.from({ length: 18 }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className="confetti"
          style={{
            left: `${(index * 37) % 100}%`,
            background:
              index % 3 === 0 ? "var(--gold)" : index % 3 === 1 ? "var(--primary)" : "var(--sky)",
            animationDelay: `${(index % 6) * 120}ms`,
          }}
        />
      ))}

      <div className="celebrate-pop">
        <Mascot mood="happy" size={132} />
      </div>
      <h2 className="font-display text-3xl text-background">Video complete!</h2>
      <div className="rise-in w-full max-w-xs space-y-2 rounded-3xl border-2 border-border bg-card p-4 text-left">
        <p className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Gems earned</span>
          <span className="flex items-center gap-1 font-extrabold text-primary">
            <Gem className="size-4" /> {countedGems}
          </span>
        </p>
        <p className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Bits finished</span>
          <span className="font-extrabold">{bits}</span>
        </p>
        <p className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Streak</span>
          <span className="font-extrabold text-sky">{streak} days</span>
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col items-stretch gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              haptic("tap");
              onContinue();
            }}
            className="btn-chunky flex-1 bg-primary px-4 py-3 text-sm text-primary-foreground"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={() => {
              haptic("tap");
              onReplay();
            }}
            className="btn-chunky flex-1 bg-sky px-4 py-3 text-sm text-sky-foreground"
          >
            Replay
          </button>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="btn-chunky bg-secondary px-4 py-3 text-sm text-secondary-foreground"
        >
          Back to path
        </button>
      </div>
    </div>
  );
}