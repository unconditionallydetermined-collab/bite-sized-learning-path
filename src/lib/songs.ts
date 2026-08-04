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

/**
 * Song pricing, derived from the app's real earning rates.
 *
 * Earning rate: a bit pays 10-40 gems (avg 25); ~1 in 8 completions pays a
 * 50-100 chest (avg 75) instead. Expected per bit ~= 0.875*25 + 0.125*75 ~= 31.
 * A reasonably active learner finishes ~6 bits/day (~186 gems), plus the
 * weekly milestone chest (~125 amortised to ~18/day) => ~205 gems/day.
 *
 * Baseline "fair" price for a permanent unlock of a ~3 min song: about 1.5
 * days of play, i.e. ~300 gems — earnable but worth working for.
 * Step 1, requested 30% discount: 300 * 0.70 = 210.
 * Step 2, single-play consumable (it re-locks after one playback, so it is
 * bought repeatedly): a further 40% off a permanent unlock => 210 * 0.60 = 126,
 * rounded to 125 gems for a ~3 min track. Short/long tracks scale around it.
 */
export const SONG_PRICE_3MIN = 125;

export function songPrice(durationSeconds: number | null): number {
  if (durationSeconds === null) return SONG_PRICE_3MIN;
  if (durationSeconds < 180) return 90;
  if (durationSeconds <= 300) return SONG_PRICE_3MIN;
  return 175;
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

/**
 * Single-play model: once a paid playback finishes the song re-locks back to
 * "saved" AND moves to the back of the buy queue, so freshly-played tracks stop
 * hogging the front of the list and something new is offered next.
 */
export async function relockSong(userId: string, songId: string) {
  const { data } = await supabase
    .from("song_queue")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1);
  const back = Number(data?.[0]?.position ?? 0) + 1;
  await supabase
    .from("song_queue")
    .update({ status: "saved", position: back })
    .eq("user_id", userId)
    .eq("song_id", songId);
}

/**
 * Whole-video credits. Finishing every bit of a video banks one credit, which
 * can be spent later on any song instead of gems.
 */
export async function earnSongCredit(userId: string): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("song_credits")
    .eq("id", userId)
    .maybeSingle();
  const next = Number(data?.song_credits ?? 0) + 1;
  await supabase.from("profiles").update({ song_credits: next }).eq("id", userId);
  return next;
}

/** Spends one banked credit to unlock a song (single play, like a gem unlock). */
export async function unlockSongWithCredit(userId: string, song: Song): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("song_credits")
    .eq("id", userId)
    .maybeSingle();
  const held = Number(data?.song_credits ?? 0);
  if (held < 1) return false;
  await supabase.from("profiles").update({ song_credits: held - 1 }).eq("id", userId);
  await supabase
    .from("song_queue")
    .upsert(
      { user_id: userId, song_id: song.id, status: "unlocked" },
      { onConflict: "user_id,song_id" },
    );
  return true;
}

/** Kept for callers that just want the play recorded. */
export async function markSongPlayed(userId: string, songId: string) {
  await relockSong(userId, songId);
}