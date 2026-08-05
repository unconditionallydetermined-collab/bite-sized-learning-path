import { supabase } from "@/integrations/supabase/client";

const STORE_KEY = "bitquest.song-titles.v1";

/** videoId -> resolved human title. Persisted so a title is fetched only once. */
type TitleCache = Record<string, string>;

function readCache(): TitleCache {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as TitleCache;
  } catch {
    return {};
  }
}

function writeCache(cache: TitleCache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked — titles simply resolve again next session */
  }
}

export function cachedTitle(videoId: string | null): string | undefined {
  if (!videoId) return undefined;
  return readCache()[videoId];
}

/** Placeholder titles look like "Song <videoId>" or are empty. */
export function isPlaceholderTitle(title: string, videoId: string | null): boolean {
  const trimmed = title.trim();
  if (trimmed.length === 0) return true;
  if (videoId && trimmed === `Song ${videoId}`) return true;
  return /^Song [\w-]{11}$/.test(trimmed);
}

/** YouTube oEmbed is CORS-friendly and needs no key — the same source the app already links to. */
async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { title?: string };
    const title = data.title?.trim();
    return title && title.length > 0 ? title : null;
  } catch {
    return null;
  }
}

export type TitledSong = { id: string; title: string; video_id: string | null };

/**
 * Resolves missing titles once per song: local cache first, then oEmbed, then
 * writes the result back to the database so it is a one-time cost per song.
 * Retroactively backfills songs saved before titles existed.
 */
export async function resolveSongTitles(songs: TitledSong[]): Promise<Record<string, string>> {
  const cache = readCache();
  const resolved: Record<string, string> = {};
  const pending: TitledSong[] = [];

  for (const song of songs) {
    if (!isPlaceholderTitle(song.title, song.video_id)) continue;
    const hit = song.video_id ? cache[song.video_id] : undefined;
    if (hit) {
      resolved[song.id] = hit;
      continue;
    }
    if (song.video_id) pending.push(song);
  }

  const fetched = await Promise.all(
    pending.map(async (song) => ({ song, title: await fetchYouTubeTitle(song.video_id!) })),
  );

  let cacheDirty = false;
  for (const { song, title } of fetched) {
    if (!title) continue;
    cache[song.video_id!] = title;
    resolved[song.id] = title;
    cacheDirty = true;
  }
  if (cacheDirty) writeCache(cache);

  // Persist the backfill so other devices/sessions read a real title directly.
  await Promise.all(
    Object.entries(resolved).map(([id, title]) =>
      supabase.from("songs").update({ title }).eq("id", id),
    ),
  );

  return resolved;
}