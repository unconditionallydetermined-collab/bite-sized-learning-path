import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Pause, Play, RotateCcw } from "lucide-react";

import { buildBits, formatClock, isLateNightWindow, type Bit } from "@/lib/bits";

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

/**
 * YouTube playback with native controls hidden and a custom bar that only
 * represents the current bit, not the whole video.
 */
export function BitPlayer({
  videoId,
  completedBits,
  startBit,
  onBitComplete,
  onUnitComplete,
}: {
  videoId: string;
  completedBits: number[];
  startBit?: number | undefined;
  onBitComplete: (bit: Bit) => void;
  onUnitComplete: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [bits, setBits] = useState<Bit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [bitDone, setBitDone] = useState(false);
  const lateNight = isLateNightWindow();

  const activeBit = bits[activeIndex];

  useEffect(() => {
    let cancelled = false;

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
            const plan = buildBits(event.target.getDuration() || 300);
            const firstUnfinished = plan.findIndex((bit) => !completedBits.includes(bit.index));
            const requested =
              startBit !== undefined && startBit >= 0 && startBit < plan.length ? startBit : null;
            const startIndex = requested ?? (firstUnfinished === -1 ? 0 : firstUnfinished);
            setBits(plan);
            setActiveIndex(startIndex);
            event.target.seekTo(plan[startIndex]!.start, true);
            event.target.pauseVideo();
            setReady(true);
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
  }, [videoId, startBit]);

  useEffect(() => {
    if (!ready || !activeBit) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const current = player.getCurrentTime();
      setElapsed(Math.max(0, current - activeBit.start));
      if (current >= activeBit.end - 0.25) {
        player.pauseVideo();
        setPlaying(false);
        setBitDone(true);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [ready, activeBit]);

  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player || !activeBit) return;
    if (playing) {
      player.pauseVideo();
      setPlaying(false);
      return;
    }
    if (bitDone) return;
    if (player.getCurrentTime() < activeBit.start || player.getCurrentTime() >= activeBit.end) {
      player.seekTo(activeBit.start, true);
    }
    player.playVideo();
    setPlaying(true);
  }, [activeBit, bitDone, playing]);

  const replay = () => {
    const player = playerRef.current;
    if (!player || !activeBit) return;
    player.seekTo(activeBit.start, true);
    setBitDone(false);
    setElapsed(0);
    player.playVideo();
    setPlaying(true);
  };

  const finishBit = () => {
    if (!activeBit) return;
    onBitComplete(activeBit);
    const nextIndex = activeIndex + 1;
    if (nextIndex >= bits.length) {
      onUnitComplete();
      return;
    }
    setActiveIndex(nextIndex);
    setElapsed(0);
    setBitDone(false);
    playerRef.current?.seekTo(bits[nextIndex]!.start, true);
    playerRef.current?.pauseVideo();
    setPlaying(false);
  };

  const progress = activeBit ? Math.min(100, (elapsed / activeBit.seconds) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border-2 border-border bg-foreground shadow-chunky">
        <div className="aspect-video w-full">
          <div ref={hostRef} className="size-full" />
        </div>

        {/* Click shield: blocks the hidden YouTube surface so only our controls work. */}
        <button
          type="button"
          aria-label={playing ? "Pause bit" : "Play bit"}
          onClick={toggle}
          className="absolute inset-0 cursor-pointer bg-transparent"
        />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/80 text-background">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}

        {/* Custom bit-scoped playback bar overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-foreground/90 to-transparent p-4">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-background/80">
            <span>
              Bit {activeIndex + 1} / {bits.length || "—"}
            </span>
            <span>
              {formatClock(elapsed)} / {formatClock(activeBit?.seconds ?? 0)}
              {lateNight ? " · late-night 30s" : ""}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-background/25">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={!ready || bitDone}
          className="btn-chunky flex items-center gap-2 bg-sky px-5 py-3 text-sm text-sky-foreground disabled:cursor-not-allowed"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? "Pause" : "Play bit"}
        </button>
        <button
          type="button"
          onClick={replay}
          disabled={!ready}
          className="btn-chunky flex items-center gap-2 bg-secondary px-4 py-3 text-sm text-secondary-foreground"
        >
          <RotateCcw className="size-4" /> Replay
        </button>
        <button
          type="button"
          onClick={finishBit}
          disabled={!bitDone}
          className="btn-chunky flex items-center gap-2 bg-primary px-5 py-3 text-sm text-primary-foreground disabled:cursor-not-allowed"
        >
          <Check className="size-4" />
          {activeIndex + 1 >= bits.length ? "Finish unit" : "Bit done"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {bits.map((bit) => (
          <span
            key={bit.index}
            title={`Bit ${bit.index + 1} · ${bit.seconds}s`}
            className={`h-2 w-8 rounded-full transition-colors ${
              completedBits.includes(bit.index) || bit.index < activeIndex
                ? "bg-primary"
                : bit.index === activeIndex
                  ? "bg-gold"
                  : "bg-track"
            }`}
          />
        ))}
      </div>
    </div>
  );
}