/**
 * Background song audio.
 *
 * The song itself plays from a hidden YouTube iframe attached to <body>, so it
 * keeps going while the learner browses the app. To survive a locked screen or
 * a backgrounded tab we also keep a silent looping <audio> element playing:
 * that gives the page an active audio session, which stops Chromium-based
 * browsers (including Brave) from freezing the tab, and lets us publish
 * Media Session metadata plus lock-screen controls.
 */
const HOST_ID = "bitquest-background-audio";
const KEEPALIVE_ID = "bitquest-audio-keepalive";

/** 1s of silence, base64 WAV — small enough to inline. */
const SILENCE =
  "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQ4AAAAAAAAAAAAAAAAAAAAAAA==";

type Handlers = { onPause?: () => void; onResume?: () => void; onNext?: () => void };

function keepalive(): HTMLAudioElement {
  let element = document.getElementById(KEEPALIVE_ID) as HTMLAudioElement | null;
  if (!element) {
    element = document.createElement("audio");
    element.id = KEEPALIVE_ID;
    element.src = SILENCE;
    element.loop = true;
    element.volume = 0.0001;
    element.setAttribute("playsinline", "");
    document.body.appendChild(element);
  }
  return element;
}

export function playBackgroundAudio(videoId: string, meta?: { title?: string; artist?: string }, handlers?: Handlers) {
  stopBackgroundAudio();
  const frame = document.createElement("iframe");
  frame.id = HOST_ID;
  frame.title = "Background song";
  frame.allow = "autoplay; encrypted-media";
  frame.style.position = "fixed";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  frame.style.bottom = "0";
  frame.style.left = "0";
  frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&controls=0`;
  document.body.appendChild(frame);

  void keepalive().play().catch(() => undefined);

  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: meta?.title ?? "BitQuest song",
      artist: meta?.artist ?? "BitQuest jukebox",
      album: "Jukebox",
      artwork: [{ src: "/images/icon-512.png", sizes: "512x512", type: "image/png" }],
    });
    navigator.mediaSession.playbackState = "playing";
    try {
      navigator.mediaSession.setActionHandler("pause", () => handlers?.onPause?.());
      navigator.mediaSession.setActionHandler("play", () => handlers?.onResume?.());
      navigator.mediaSession.setActionHandler("nexttrack", () => handlers?.onNext?.());
    } catch {
      /* handler unsupported */
    }
  }
}

export function stopBackgroundAudio() {
  document.getElementById(HOST_ID)?.remove();
  const element = document.getElementById(KEEPALIVE_ID) as HTMLAudioElement | null;
  element?.pause();
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
}

export function isBackgroundAudioPlaying(): boolean {
  return Boolean(document.getElementById(HOST_ID));
}
