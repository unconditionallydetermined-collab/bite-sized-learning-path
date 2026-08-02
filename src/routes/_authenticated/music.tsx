import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Gem, Headphones, Music, Play, Plus, Square } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ImmersivePlayer } from "@/components/ImmersivePlayer";
import { Mascot } from "@/components/Mascot";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { playBackgroundAudio, stopBackgroundAudio } from "@/lib/audio";
import {
  addSongs,
  fetchQueue,
  fetchSongs,
  markSongPlayed,
  redeemBatch,
  songPrice,
  type Song,
} from "@/lib/songs";

export const Route = createFileRoute("/_authenticated/music")({
  head: () => ({
    meta: [
      { title: "Jukebox — BitQuest" },
      {
        name: "description",
        content: "Redeem gems for songs, queue them up, and play straight through in the jukebox.",
      },
      { property: "og:title", content: "Jukebox — BitQuest" },
      { property: "og:description", content: "Spend gems to unlock songs after finishing videos." },
    ],
  }),
  component: MusicPage,
});

function MusicPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const [links, setLinks] = useState("");
  const [batch, setBatch] = useState(3);
  const [queueIndex, setQueueIndex] = useState<number | null>(null);
  const [videoSong, setVideoSong] = useState<Song | null>(null);

  const { data: songs = [] } = useQuery({
    queryKey: ["songs", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchSongs(userId),
  });
  const { data: queue = [] } = useQuery({
    queryKey: ["song-queue", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchQueue(userId),
  });

  const unlockedIds = new Set(queue.map((entry) => entry.song_id));
  const lockedSongs = songs.filter((song) => !unlockedIds.has(song.id));
  const playable = queue.filter((entry) => entry.status !== "played");
  const batchCost = lockedSongs
    .slice(0, batch)
    .reduce((sum, song) => sum + songPrice(song.duration_seconds), 0);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["songs", userId] }),
      queryClient.invalidateQueries({ queryKey: ["song-queue", userId] }),
      queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
    ]);

  const submitLinks = async () => {
    try {
      const result = await addSongs(userId, links);
      if (result.added === 0) {
        toast.error("No valid YouTube links found.");
        return;
      }
      toast.success(`Added ${result.added} song(s).`);
      setLinks("");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add songs");
    }
  };

  const redeem = async () => {
    const result = await redeemBatch(userId, lockedSongs, batch);
    if ("error" in result) {
      toast.error(result.error === "funds" ? "Not enough gems yet." : "Add some songs first.");
      return;
    }
    toast.success(`Queued ${result.unlocked} song(s) for ${result.cost} gems.`);
    await refresh();
  };

  /** Auto-plays the purchased queue in order, then stops — never loops. */
  const playQueue = () => {
    if (playable.length === 0) {
      toast("Redeem gems to queue up songs first.");
      return;
    }
    setQueueIndex(0);
    playBackgroundAudio(playable[0]!.song.video_id ?? "");
  };

  const advanceQueue = async () => {
    if (queueIndex === null) return;
    const current = playable[queueIndex];
    if (current) await markSongPlayed(userId, current.song_id);
    const next = queueIndex + 1;
    if (next >= playable.length) {
      stopBackgroundAudio();
      setQueueIndex(null);
      toast("Queue finished. Redeem more gems for another set.");
      await refresh();
      return;
    }
    setQueueIndex(next);
    playBackgroundAudio(playable[next]!.song.video_id ?? "");
  };

  const stopQueue = () => {
    stopBackgroundAudio();
    setQueueIndex(null);
  };

  if (videoSong) {
    return (
      <ImmersivePlayer
        videoId={videoSong.video_id ?? ""}
        label={videoSong.title}
        exitPrompt="Leave this song?"
        onSegmentEnd={() => setVideoSong(null)}
        onExit={() => setVideoSong(null)}
      />
    );
  }

  return (
    <AppShell>
      <h1 className="text-2xl">Jukebox</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Gem className="size-4 text-primary" /> {profile?.gems ?? 0} gems · {playable.length} in queue
      </p>

      {/* Simple song ingestion — one link or several comma-separated. Songs are never chunked. */}
      <div className="mt-5 rounded-3xl border-2 border-border bg-card p-5 shadow-chunky-sm">
        <h2 className="text-base">Add songs</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste one YouTube link, or several separated by commas.
        </p>
        <textarea
          value={links}
          onChange={(event) => setLinks(event.target.value)}
          rows={3}
          placeholder="https://youtu.be/aaa, https://youtu.be/bbb"
          className="mt-3 w-full rounded-2xl border-2 border-input bg-background p-3 text-sm outline-none focus:border-ring"
        />
        <button
          type="button"
          onClick={() => void submitLinks()}
          disabled={links.trim().length === 0}
          className="btn-chunky mt-3 flex items-center gap-2 bg-primary px-4 py-3 text-sm text-primary-foreground"
        >
          <Plus className="size-4" /> Add to catalog
        </button>
      </div>

      {/* Batch redemption: spend gems to unlock a set of songs at once. */}
      <div className="mt-5 rounded-3xl border-2 border-border bg-card p-5 shadow-chunky-sm">
        <h2 className="text-base">Redeem gems</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {lockedSongs.length} song(s) available to unlock.
        </p>
        <div className="mt-3 flex items-center gap-2">
          {[1, 3, 5].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setBatch(count)}
              className={`tap-bounce rounded-2xl border-2 px-4 py-2 text-sm font-extrabold ${
                batch === count ? "border-primary bg-primary/15 text-primary" : "border-border"
              }`}
            >
              {count} song{count > 1 ? "s" : ""}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void redeem()}
          disabled={lockedSongs.length === 0}
          className="btn-chunky mt-3 flex items-center gap-2 bg-gold px-4 py-3 text-sm text-gold-foreground"
        >
          <Gem className="size-4" /> Unlock for {batchCost} gems
        </button>
      </div>

      <div className="mt-5 rounded-3xl border-2 border-border bg-card p-5 shadow-chunky-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base">Your queue</h2>
          {queueIndex === null ? (
            <button
              type="button"
              onClick={playQueue}
              className="btn-chunky flex items-center gap-2 bg-primary px-4 py-3 text-sm text-primary-foreground"
            >
              <Play className="size-4" /> Play
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void advanceQueue()}
                className="btn-chunky bg-sky px-3 py-2.5 text-xs text-sky-foreground"
              >
                Next
              </button>
              <button
                type="button"
                onClick={stopQueue}
                className="btn-chunky flex items-center gap-1.5 bg-secondary px-3 py-2.5 text-xs text-secondary-foreground"
              >
                <Square className="size-3.5" /> Stop
              </button>
            </div>
          )}
        </div>

        {playable.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 text-center">
            <Mascot mood="neutral" size={88} />
            <Music className="size-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Nothing queued. Finish a whole video for an offer, or redeem gems above.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {playable.map((entry, index) => (
              <li
                key={entry.id}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
                  queueIndex === index ? "bg-primary/15" : "bg-secondary/60"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{entry.song.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {entry.status === "saved" ? "Saved for later" : "Unlocked"}
                  </span>
                </span>
                {queueIndex === index && <Headphones className="size-4 text-primary" />}
                <button
                  type="button"
                  onClick={() => setVideoSong(entry.song)}
                  className="tap-bounce rounded-xl border-2 border-border px-2.5 py-1.5 text-[11px] font-extrabold"
                >
                  Watch
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}