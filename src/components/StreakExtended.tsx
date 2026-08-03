import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

import { haptic } from "@/lib/haptics";
import { playStreakSfx } from "@/lib/sfx";

/**
 * Distinct "streak extended" beat: the flame flares, the number ticks up from
 * the previous value, and the whole card pops.
 */
export function StreakExtended({
  streak,
  usedCatchUp = false,
  onDone,
}: {
  streak: number;
  usedCatchUp?: boolean;
  onDone: () => void;
}) {
  const [shown, setShown] = useState(Math.max(0, streak - 1));

  useEffect(() => {
    haptic("streak");
    playStreakSfx();
    const bump = window.setTimeout(() => setShown(streak), 520);
    const exit = window.setTimeout(onDone, 2400);
    return () => {
      window.clearTimeout(bump);
      window.clearTimeout(exit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  return (
    <div className="absolute inset-0 z-45 flex flex-col items-center justify-center gap-4 bg-foreground/92 p-6 text-center">
      <span className="flame-flare flex size-28 items-center justify-center rounded-full border-4 border-sky bg-sky/20 text-sky">
        <Flame className="size-14" />
      </span>
      <p key={shown} className="count-pop font-display text-5xl text-background">
        {shown}
      </p>
      <p className="text-sm font-extrabold uppercase tracking-widest text-background/80">
        {usedCatchUp ? "Caught up — streak saved!" : "Day streak extended"}
      </p>
    </div>
  );
}
