import { useEffect } from "react";

import { ensureNotificationPermission, maybeSendDailyNotification } from "@/lib/notify";

declare global {
  interface Window {
    /** Injected by the Android wrapper so the home-screen widget can show stats. */
    BitQuestNative?: { setStats?: (streak: number, gems: number) => void };
  }
}

/**
 * Local daily reminder loop + native widget stat bridge.
 *
 * Permission is asked once, on the learner's first tap (browsers require a
 * gesture), and the peak-hour check runs on a light one-minute timer.
 */
export function useDailyNudge(streak: number, gems: number) {
  useEffect(() => {
    let asked = false;
    const ask = () => {
      if (asked) return;
      asked = true;
      void ensureNotificationPermission();
      window.removeEventListener("pointerdown", ask);
    };
    window.addEventListener("pointerdown", ask, { once: false });
    return () => window.removeEventListener("pointerdown", ask);
  }, []);

  useEffect(() => {
    const tick = () => void maybeSendDailyNotification({ streak, gems });
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [streak, gems]);

  useEffect(() => {
    try {
      window.BitQuestNative?.setStats?.(streak, gems);
    } catch {
      /* wrapper not present in the browser */
    }
  }, [streak, gems]);
}
