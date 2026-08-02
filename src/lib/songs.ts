import { supabase } from "@/integrations/supabase/client";
import { extractVideoId } from "@/lib/parser";
import { spendGems } from "@/lib/gems";

export type Song = {
  id: string;
  title: string;
  youtube_url: string;
  video_id: string | null;
  duration_seconds: number | null;
};

export type QueueEntry = {
  id: string;
  song_id: string;
  status: "saved" | "unlocked" | "played";
  position: number;
  song: Song;
};

/** Songs are never chunked into bits — this is a simple catalog add. */
export function parseSongLinks(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((chunk) => chunk.trim().replace(/^\[|\]$/g, ""))
    .filter((chunk) => chunk.length > 0);
}

export function songPrice(durationSeconds: number | null): number {
  if (durationSeconds === null) return 175;
  if (durationSeconds < 180) return 100;
  if (durationSeconds <= 300) return 175;
  return 250;
}

export async function addSongs(
  userId: string,
  input: string,
): Promise<{ added: number; skipped: string[] }> {
  const links = parseSongLinks(input);
  const skipped: string[] = [];
  const rows = links.flatMap((link) => {
    const videoId = extractVideoId(link);
    if (!videoId) {
      skipped.push(link);
      return [];
    }
    return [
      {
        user_id: userId,
        title: `Song ${videoId}`,
        youtube_url: link,
        video_id: videoId,
      },
    ];
  });
  if (rows.length === 0) return { added: 0, skipped };
  const { error } = await supabase.from("songs").insert(rows);
  if (error) throw error;
  return { added: rows.length, skipped };
}

export async function fetchSongs(userId: string): Promise<Song[]> {
  const { data } = await supabase
    .from("songs")
    .select("id, title, youtube_url, video_id, duration_seconds")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return (data ?? []) as Song[];
}

export async function fetchQueue(userId: string): Promise<QueueEntry[]> {
  const { data } = await supabase
    .from("song_queue")
    .select("id, song_id, status, position, songs(id, title, youtube_url, video_id, duration_seconds)")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  return (data ?? []).flatMap((row) => {
    const song = (row as { songs: Song | null }).songs;
    if (!song) return [];
    return [
      {
        id: row.id,
        song_id: row.song_id,
        status: row.status as QueueEntry["status"],
        position: row.position,
        song,
      },
    ];
  });
}

/** "Save for later" — no gems spent yet. */
export async function saveSongForLater(userId: string, songId: string) {
  const { error } = await supabase
    .from("song_queue")
    .upsert({ user_id: userId, song_id: songId, status: "saved" }, { onConflict: "user_id,song_id" });
  if (error) throw error;
}

/** Pays for one song and marks it unlocked/played-ready. */
export async function unlockSong(userId: string, song: Song): Promise<boolean> {
  const paid = await spendGems(userId, songPrice(song.duration_seconds));
  if (!paid) return false;
  await supabase
    .from("song_queue")
    .upsert(
      { user_id: userId, song_id: song.id, status: "unlocked" },
      { onConflict: "user_id,song_id" },
    );
  return true;
}

/** Batch redemption: buys the next `count` locked songs at once. */
export async function redeemBatch(
  userId: string,
  songs: Song[],
  count: number,
): Promise<{ unlocked: number; cost: number } | { error: "funds" | "empty" }> {
  const picks = songs.slice(0, count);
  if (picks.length === 0) return { error: "empty" };
  const cost = picks.reduce((sum, song) => sum + songPrice(song.duration_seconds), 0);
  const paid = await spendGems(userId, cost);
  if (!paid) return { error: "funds" };
  const { error } = await supabase.from("song_queue").upsert(
    picks.map((song, index) => ({
      user_id: userId,
      song_id: song.id,
      status: "unlocked",
      position: index,
    })),
    { onConflict: "user_id,song_id" },
  );
  if (error) throw error;
  return { unlocked: picks.length, cost };
}

export async function markSongPlayed(userId: string, songId: string) {
  await supabase
    .from("song_queue")
    .update({ status: "played" })
    .eq("user_id", userId)
    .eq("song_id", songId);
}