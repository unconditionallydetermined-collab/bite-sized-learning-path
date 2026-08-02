import { Headphones, Music, Save } from "lucide-react";

import { songPrice, type Song } from "@/lib/songs";

/** Post-completion song offer: play now for gems, or queue it for free. */
export function SongOffer({
  song,
  gems,
  onPlayVideo,
  onPlayAudio,
  onSaveForLater,
  onDismiss,
}: {
  song: Song;
  gems: number;
  onPlayVideo: () => void;
  onPlayAudio: () => void;
  onSaveForLater: () => void;
  onDismiss: () => void;
}) {
  const price = songPrice(song.duration_seconds);
  const affordable = gems >= price;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-foreground/90 p-6">
      <div className="rise-in w-full max-w-sm space-y-4 rounded-3xl border-2 border-border bg-card p-6 text-center shadow-chunky">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sky/15 text-sky">
          <Music className="size-7" />
        </span>
        <div>
          <h2 className="text-lg">Song unlocked?</h2>
          <p className="mt-1 text-sm text-muted-foreground">{song.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {price} gems · you have {gems}
          </p>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            disabled={!affordable}
            onClick={onPlayVideo}
            className="btn-chunky w-full bg-primary px-4 py-3 text-sm text-primary-foreground"
          >
            Watch now for {price} gems
          </button>
          <button
            type="button"
            disabled={!affordable}
            onClick={onPlayAudio}
            className="btn-chunky flex w-full items-center justify-center gap-2 bg-sky px-4 py-3 text-sm text-sky-foreground"
          >
            <Headphones className="size-4" /> Play as background audio
          </button>
          <button
            type="button"
            onClick={onSaveForLater}
            className="btn-chunky flex w-full items-center justify-center gap-2 bg-secondary px-4 py-3 text-sm text-secondary-foreground"
          >
            <Save className="size-4" /> Save for the gym
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full pt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}