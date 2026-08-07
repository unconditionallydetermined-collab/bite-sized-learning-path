import { useCallback, useEffect, useRef, useState } from "react";
import { NotebookPen, Play, X } from "lucide-react";

import { haptic } from "@/lib/haptics";
import { loadNote, saveNote } from "@/lib/notes";
import { getPlayhead, setPlayhead } from "@/lib/playhead";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: { Player: new (element: HTMLElement, options: unknown) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const existing = document.getElementById("youtube-iframe-api");
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (existing) return;
    const script = document.createElement("script");
    script.id = "youtube-iframe-api";
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
}

export type Segment = { start: number; end: number };

const DOUBLE_TAP_MS = 300;
/** Spring resistance: the further you drag, the harder it pulls back. */
function resist(dx: number, limit = 140): number {
  return limit * Math.tanh(dx / limit);
}

/** Underdamped spring constants — snaps home with a small overshoot. */
const SPRING_K = 190;
const SPRING_C = 12;

/**
 * One immersive player reused for lesson bits and full songs.
 *
 * Layout is portrait-friendly letterboxing: the video keeps its native 16:9
 * ratio, centred, with plain background above and below — never stretched or
 * cropped.
 *
 * Gestures: tap = play/pause, quick right-to-left swipe = rewind 5s, and
 * double-tap-and-hold then slide left/right nudges the frame horizontally with
 * spring resistance, snapping back the moment the finger lifts. There is no
 * persistent zoom or pan state.
 */
export function ImmersivePlayer({
  videoId,
  segment,
  label,
  sublabel,
  exitPrompt = "Leave and lose your progress on this lesson?",
  resume = false,
  onSegmentEnd,
  onDuration,
  onExit,
  overlay,
}: {
  videoId: string;
  segment?: Segment | undefined;
  label?: string | undefined;
  sublabel?: string | undefined;
  exitPrompt?: string;
  /** Resume from the stored playhead instead of the segment start. */
  resume?: boolean;
  onSegmentEnd?: (() => void) | undefined;
  onDuration?: ((seconds: number) => void) | undefined;
  onExit: () => void;
  overlay?: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const touchX = useRef<number | null>(null);
  const lastTap = useRef(0);
  const dragFrom = useRef<number | null>(null);
  const springRef = useRef<number | null>(null);
  const shiftRef = useRef(0);
  const velocity = useRef(0);
  const lastMove = useRef({ x: 0, t: 0 });
  const endedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [ambient, setAmbient] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [rewindPulse, setRewindPulse] = useState(false);
  const [shift, setShift] = useState(0);
  const [dragging, setDragging] = useState(false);

  const start = segment?.start ?? 0;
  const end = segment?.end;

  const entryPoint = () => {
    if (!resume) return start;
    const stored = getPlayhead(videoId);
    if (end !== undefined) return stored > start && stored < end - 1 ? stored : start;
    return stored > 1 ? stored : start;
  };

  useEffect(() => {
    let cancelled = false;
    endedRef.current = false;

    void loadIframeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          playsinline: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event: { target: YTPlayer }) => {
            if (cancelled) return;
            onDuration?.(event.target.getDuration() || 0);
            event.target.seekTo(entryPoint(), true);
            event.target.pauseVideo();
            setReady(true);
          },
          onStateChange: (event: { data: number }) => {
            if (cancelled) return;
            if (event.data === 0 && !endedRef.current) {
              endedRef.current = true;
              setPlaying(false);
              onSegmentEnd?.();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      const time = playerRef.current?.getCurrentTime?.() ?? 0;
      if (time > 0 && !endedRef.current) setPlayhead(videoId, time);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, start]);

  useEffect(() => {
    if (!ready || !started) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const current = player.getCurrentTime();
      setElapsed(Math.max(0, current - start));
      setPlayhead(videoId, current);
      if (end !== undefined && current >= end - 0.25 && !endedRef.current) {
        endedRef.current = true;
        player.pauseVideo();
        setPlaying(false);
        onSegmentEnd?.();
      }
    }, 250);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, started, start, end, videoId]);

  const beginPlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player || started) return;
    haptic("tap");
    setAmbient(true);
    window.setTimeout(() => {
      player.seekTo(entryPoint(), true);
      player.playVideo();
      setStarted(true);
      setPlaying(true);
    }, 620);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, started]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || !started || endedRef.current) return;
    haptic("tap");
    if (playing) {
      player.pauseVideo();
      setPlaying(false);
    } else {
      player.playVideo();
      setPlaying(true);
    }
  }, [playing, started]);

  const rewind = useCallback(() => {
    const player = playerRef.current;
    if (!player || !started) return;
    haptic("tap");
    player.seekTo(Math.max(start, player.getCurrentTime() - 5), true);
    setRewindPulse(true);
    window.setTimeout(() => setRewindPulse(false), 500);
  }, [start, started]);

  const total = end !== undefined ? end - start : 0;
  const progress = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;

  /** Releases the held frame: real spring integration back to centre. */
  const releaseSpring = useCallback((from: number, velocity: number) => {
    if (springRef.current !== null) cancelAnimationFrame(springRef.current);
    let x = from;
    let v = velocity;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      v += (-SPRING_K * x - SPRING_C * v) * dt;
      x += v * dt;
      if (Math.abs(x) < 0.5 && Math.abs(v) < 6) {
        setShift(0);
        springRef.current = null;
        return;
      }
      setShift(x);
      springRef.current = requestAnimationFrame(step);
    };
    springRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(
    () => () => {
      if (springRef.current !== null) cancelAnimationFrame(springRef.current);
    },
    [],
  );

  return (
    <div className="player-surface fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Letterboxed 16:9 frame centred in the portrait viewport. */}
      <div
        className={`pointer-events-none relative aspect-video w-full max-h-[100vh] max-w-[100vw] ${
          started ? "opacity-100" : ambient ? "ambient-in" : "scale-[0.98] opacity-45 blur-sm"
        }`}
        style={{ transform: `translateX(${shift}px) scale(${dragging ? 0.98 : 1})` }}
      >
        <div ref={hostRef} className="size-full" />
      </div>

      {/* Tap = play/pause. Quick left swipe = rewind. Double-tap + hold + slide = elastic nudge. */}
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={started && shift === 0 ? togglePlay : undefined}
        onTouchStart={(event) => {
          const x = event.touches[0]?.clientX ?? null;
          touchX.current = x;
          const now = Date.now();
          if (now - lastTap.current < DOUBLE_TAP_MS) {
            dragFrom.current = x;
            if (springRef.current !== null) cancelAnimationFrame(springRef.current);
            lastMove.current = { x: x ?? 0, t: performance.now() };
            velocity.current = 0;
            setDragging(true);
            haptic("tap");
          }
          lastTap.current = now;
        }}
        onTouchMove={(event) => {
          if (dragFrom.current === null) return;
          const x = event.touches[0]?.clientX ?? dragFrom.current;
          const next = resist(x - dragFrom.current);
          const now = performance.now();
          const dt = (now - lastMove.current.t) / 1000;
          if (dt > 0) velocity.current = (next - shiftRef.current) / dt;
          lastMove.current = { x, t: now };
          shiftRef.current = next;
          setShift(next);
        }}
        onTouchEnd={(event) => {
          const from = touchX.current;
          const to = event.changedTouches[0]?.clientX ?? null;
          touchX.current = null;
          if (dragFrom.current !== null) {
            dragFrom.current = null;
            setDragging(false);
            releaseSpring(shiftRef.current, velocity.current);
            shiftRef.current = 0;
            velocity.current = 0;
            return;
          }
          if (from !== null && to !== null && from - to > 60) rewind();
        }}
        className="absolute inset-0 cursor-pointer bg-transparent"
      />

      {!started && (
        <button
          type="button"
          onClick={beginPlayback}
          disabled={!ready || ambient}
          aria-label="Start playback"
          className={`tap-bounce absolute z-10 flex size-24 items-center justify-center rounded-full border-4 border-background/70 bg-primary text-primary-foreground shadow-chunky transition-all duration-500 ${
            ambient ? "scale-150 opacity-0" : "play-glow"
          }`}
        >
          <Play className="size-10" />
        </button>
      )}

      {rewindPulse && (
        <span className="pointer-events-none absolute left-8 top-1/2 z-10 -translate-y-1/2 rounded-2xl bg-background/85 px-3 py-2 text-xs font-extrabold text-foreground">
          −5s
        </span>
      )}

      <button
        type="button"
        onClick={() => {
          haptic("tap");
          setConfirmExit(true);
        }}
        aria-label="Close player"
        className="tap-bounce absolute right-4 top-4 z-20 rounded-full border-2 border-background/50 bg-foreground/70 p-2.5 text-background"
      >
        <X className="size-5" />
      </button>

      {(label || total > 0) && started && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 space-y-2 bg-gradient-to-t from-foreground/90 to-transparent p-5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-background/80">
            <span>{label}</span>
            <span>{sublabel}</span>
          </div>
          {total > 0 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-background/25">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {overlay}

      {confirmExit && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-foreground/85 p-6">
          <div className="rise-in w-full max-w-sm rounded-3xl border-2 border-border bg-card p-6 text-center shadow-chunky">
            <h2 className="text-lg">{exitPrompt}</h2>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="btn-chunky flex-1 bg-secondary px-4 py-3 text-sm text-secondary-foreground"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={onExit}
                className="btn-chunky flex-1 bg-destructive px-4 py-3 text-sm text-destructive-foreground"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
