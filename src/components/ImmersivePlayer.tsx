import { useCallback, useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";

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

/**
 * One immersive player reused for lesson bits and full songs.
 *
 * Controls, and nothing else: single one-shot play button with an ambient
 * transition, tap anywhere to play/pause, right-to-left swipe rewinds 5s, and a
 * persistent × that asks before leaving.
 */
export function ImmersivePlayer({
  videoId,
  segment,
  label,
  sublabel,
  exitPrompt = "Leave and lose your progress on this lesson?",
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
  onSegmentEnd?: (() => void) | undefined;
  onDuration?: ((seconds: number) => void) | undefined;
  onExit: () => void;
  overlay?: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const touchX = useRef<number | null>(null);
  const endedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [ambient, setAmbient] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [rewindPulse, setRewindPulse] = useState(false);

  const start = segment?.start ?? 0;
  const end = segment?.end;

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
            event.target.seekTo(start, true);
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
      if (end !== undefined && current >= end - 0.25 && !endedRef.current) {
        endedRef.current = true;
        player.pauseVideo();
        setPlaying(false);
        onSegmentEnd?.();
      }
    }, 250);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, started, start, end]);

  const beginPlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player || started) return;
    setAmbient(true);
    window.setTimeout(() => {
      player.seekTo(start, true);
      player.playVideo();
      setStarted(true);
      setPlaying(true);
    }, 620);
  }, [start, started]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || !started || endedRef.current) return;
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
    player.seekTo(Math.max(start, player.getCurrentTime() - 5), true);
    setRewindPulse(true);
    window.setTimeout(() => setRewindPulse(false), 500);
  }, [start, started]);

  const total = end !== undefined ? end - start : 0;
  const progress = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-foreground">
      {/* Fit-to-screen: the frame is scaled to cover the viewport, no letterboxing. */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${
          started ? "scale-100 opacity-100" : ambient ? "ambient-in" : "scale-105 opacity-40 blur-sm"
        }`}
        style={{ width: "max(100vw, 177.78vh)", height: "max(100vh, 56.25vw)" }}
      >
        <div ref={hostRef} className="size-full" />
      </div>

      {/* Tap = play/pause. Right-to-left swipe = rewind 5s. Nothing else. */}
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={started ? togglePlay : undefined}
        onTouchStart={(event) => {
          touchX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const from = touchX.current;
          const to = event.changedTouches[0]?.clientX ?? null;
          touchX.current = null;
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
          className={`tap-bounce relative z-10 flex size-24 items-center justify-center rounded-full border-4 border-background/70 bg-primary text-primary-foreground shadow-chunky transition-all duration-500 ${
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
        onClick={() => setConfirmExit(true)}
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