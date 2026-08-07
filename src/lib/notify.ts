/**
 * Smart daily reminder — fully local, no backend.
 *
 * We keep a 24-slot histogram of how many seconds of lessons the learner has
 * watched in each hour of the day. The fullest hour is their "peak time"; once
 * a day, at that hour, we fire one local notification. Copy depends on whether
 * they have already learned today: a cheeky nudge if not, a hype-up if yes.
 */
const HIST_KEY = "bitquest:activity-hours";
const LAST_LESSON_KEY = "bitquest:last-lesson-day";
const LAST_NOTIFY_KEY = "bitquest:last-notify-day";

const DEFAULT_PEAK_HOUR = 19;

function today(): string {
  return new Date().toDateString();
}

function readHistogram(): number[] {
  const empty = new Array<number>(24).fill(0);
  if (typeof localStorage === "undefined") return empty;
  try {
    const raw = localStorage.getItem(HIST_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 24) return empty;
    return parsed.map((value) => (typeof value === "number" && value >= 0 ? value : 0));
  } catch {
    return empty;
  }
}

/** Called whenever a bit finishes: credits its seconds to the current hour. */
export function recordLessonActivity(seconds: number): void {
  if (typeof localStorage === "undefined") return;
  const hist = readHistogram();
  const hour = new Date().getHours();
  hist[hour] = (hist[hour] ?? 0) + Math.max(1, Math.round(seconds));
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify(hist));
    localStorage.setItem(LAST_LESSON_KEY, today());
  } catch {
    /* ignore */
  }
}

export function didLessonToday(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(LAST_LESSON_KEY) === today();
}

/** Hour (0-23) where the learner has cumulatively spent the most time. */
export function peakHour(): number {
  const hist = readHistogram();
  let best = -1;
  let bestHour = DEFAULT_PEAK_HOUR;
  hist.forEach((value, hour) => {
    if (value > best) {
      best = value;
      bestHour = hour;
    }
  });
  return best <= 0 ? DEFAULT_PEAK_HOUR : bestHour;
}

const NUDGES = [
  { title: "Your streak is giving me the silent treatment 👀", body: "One 60-second bit and all is forgiven. Bit is waiting." },
  { title: "Bit checked the app. You weren't there. 🐝", body: "Your streak is one skipped lesson from tragedy. Fix it in 60 seconds." },
  { title: "This is not a drill 🚨", body: "Zero bits today. Your future self is filing a complaint." },
  { title: "Hey. Yes, you. 👋", body: "You had time to scroll, so you have time for one tiny lesson." },
];

const HYPE = [
  { title: "Look at you go 🔥", body: "Lesson done, gems banked, streak safe. Another bit while you're hot?" },
  { title: "Certified productive 💎", body: "Today's lesson is in the bag. Your streak just flexed." },
  { title: "Bit is proud of you 🐝", body: "You showed up today. That's how streaks turn into skills." },
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

async function show(title: string, body: string): Promise<void> {
  const options: NotificationOptions = {
    body,
    icon: "/images/icon-512.png",
    badge: "/images/icon-512.png",
    tag: "bitquest-daily",
  };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    /* fall through to the page-level notification */
  }
  new Notification(title, options);
}

/**
 * Fires at most one notification per day, at the learner's peak hour.
 * Safe to call on a timer — it self-throttles through localStorage.
 */
export async function maybeSendDailyNotification(stats: {
  streak: number;
  gems: number;
}): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(LAST_NOTIFY_KEY) === today()) return;
  if (new Date().getHours() !== peakHour()) return;

  localStorage.setItem(LAST_NOTIFY_KEY, today());

  if (didLessonToday()) {
    const message = pick(HYPE);
    await show(
      message.title,
      `${message.body} · ${stats.streak}-day streak · ${stats.gems} gems`,
    );
    return;
  }
  const message = pick(NUDGES);
  await show(
    message.title,
    stats.streak > 0 ? `${message.body} (${stats.streak}-day streak on the line.)` : message.body,
  );
}
