import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minimize2, Pause, Play, X } from "lucide-react";

import { haptic } from "@/lib/haptics";
import { getPlayhead, setPlayhead } from "@/lib/playhead";

type MiniVideo = { videoId: string; title: string; startAt?: number };

type MiniPlayerApi = {
  current: MiniVideo | null;
  open: (video: MiniVideo) => void;
  close: () => void;
  expand: () => void;
};

const MiniPlayerContext = createContext<MiniPlayerApi>({
  current: null,
  open: () => undefined,
  close: () => undefined,
  expand: () => undefined,
});

export function useMiniPlayer() {
  return useContext(MiniPlayerContext);
}

type YT = {
  getCurrentTime: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
};

function loadApi(): Promise<void> {
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
 * Persistent, dockable mini-player. It keeps playing while the learner moves
 * around the app and always resumes from the stored playhead, so nothing ever
 * restarts from zero. Tap the card (or the expand button) to zoom it to full
 * view; the same iframe is reused so playback never stops.
 */
export function MiniPlayerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<MiniVideo | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(true);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT | null>(null);

  const open = useCallback((video: MiniVideo) => {
    setCurrent(video);
    setExpanded(false);
    setPlaying(true);
  }, []);

  const close = useCallback(() => {
    const time = playerRef.current?.getCurrentTime?.() ?? 0;
    if (current && time > 0) setPlayhead(current.videoId, time);
    playerRef.current?.destroy();
    playerRef.current = null;
    setCurrent(null);
    setExpanded(false);
  }, [current]);

  const expand = useCallback(() => setExpanded(true), []);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    const startAt = current.startAt ?? getPlayhead(current.videoId);

    void loadApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId: current.videoId,
        playerVars: { controls: 0, modestbranding: 1, rel: 0, playsinline: 1, start: Math.floor(startAt) },
        events: {
          onReady: (event: { target: YT }) => event.target.playVideo(),
        },
      }) as unknown as YT;
    });

    const timer = window.setInterval(() => {
      const time = playerRef.current?.getCurrentTime?.() ?? 0;
      if (time > 0) setPlayhead(current.videoId, time);
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [current]);

  const toggle = () => {
    const player = playerRef.current;
    if (!player) return;
    haptic("tap");
    if (playing) player.pauseVideo();
    else player.playVideo();
    setPlaying(!playing);
  };

  return (
    <MiniPlayerContext.Provider value={{ current, open, close, expand }}>
      {children}
      {current && (
        <div
          className={
            expanded
              ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground/95 p-4"
              : "mini-dock fixed bottom-40 right-3 z-50 w-52 overflow-hidden rounded-2xl border-2 border-border bg-card shadow-chunky"
          }
        >
          <div className={expanded ? "aspect-video w-full max-w-3xl overflow-hidden rounded-2xl" : "aspect-video w-full"}>
            <div ref={hostRef} className="size-full" />
          </div>
          <div
            className={`flex w-full items-center gap-2 px-2 py-2 ${
              expanded ? "max-w-3xl justify-between text-background" : ""
            }`}
          >
            <span className="min-w-0 flex-1 truncate text-[11px] font-extrabold">{current.title}</span>
            <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="tap-bounce">
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                haptic("tap");
                setExpanded(!expanded);
              }}
              aria-label={expanded ? "Shrink player" : "Expand player"}
              className="tap-bounce"
            >
              {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
            <button type="button" onClick={close} aria-label="Close mini player" className="tap-bounce">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </MiniPlayerContext.Provider>
  );
}
