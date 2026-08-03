import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ChestReveal, CompletionCelebration } from "@/components/GemReward";
import { ImmersivePlayer } from "@/components/ImmersivePlayer";
import { SongOffer } from "@/components/SongOffer";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { buildBits, formatClock, type Bit } from "@/lib/bits";
import { playBackgroundAudio } from "@/lib/audio";
import { StreakExtended } from "@/components/StreakExtended";
import { useMiniPlayer } from "@/components/MiniPlayer";
import { UNIT_COMPLETE_BIT_INDEX, completeStreakDay, type StreakResult } from "@/lib/course-data";
import { haptic } from "@/lib/haptics";
import { clearPlayhead } from "@/lib/playhead";
import { recordCompletion, resetPace, shouldShowFullCelebration } from "@/lib/session-pace";
import {
  awardGems,
  rollBitReward,
  rollMilestoneChest,
  streakMilestone,
  type GemDrop,
} from "@/lib/gems";
import { fetchQueue, fetchSongs, relockSong, saveSongForLater, unlockSong, type Song } from "@/lib/songs";

export const Route = createFileRoute("/_authenticated/learn/$unitId")({
  validateSearch: (search: Record<string, unknown>): { bit?: number } => {
    const raw = Number(search['bit']);
    return Number.isFinite(raw) && raw >= 0 ? { bit: Math.floor(raw) } : {};
  },
  head: () => ({
    meta: [
      { title: "Learning bit — BitQuest" },
      {
        name: "description",
        content: "Watch one actionable 60-90 second bit at a time with a custom bit-scoped player.",
      },
      { property: "og:title", content: "Learning bit — BitQuest" },
      {
        property: "og:description",
        content: "Micro-learning playback: native controls off, one bit at a time.",
      },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const { unitId } = Route.useParams();
  const { bit: startBit } = Route.useSearch();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const [bits, setBits] = useState<Bit[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chest, setChest] = useState<GemDrop | null>(null);
  const [runGems, setRunGems] = useState(0);
  const [runBits, setRunBits] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [songOffer, setSongOffer] = useState<Song | null>(null);
  const [songPlaying, setSongPlaying] = useState<Song | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [streakBeat, setStreakBeat] = useState<StreakResult | null>(null);
  const [pendingChest, setPendingChest] = useState<GemDrop | null>(null);
  const mini = useMiniPlayer();

  const { data, isLoading } = useQuery({
    queryKey: ["unit", unitId, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [unitResult, bitResult] = await Promise.all([
        supabase
          .from("units")
          .select("id, title, video_id, youtube_url, quest_id, quests(title)")
          .eq("id", unitId)
          .maybeSingle(),
        supabase.from("bit_progress").select("bit_index").eq("unit_id", unitId).eq("user_id", userId),
      ]);
      if (unitResult.error) throw unitResult.error;
      return {
        unit: unitResult.data,
        bitsDone: (bitResult.data ?? []).map((row) => row.bit_index).filter((index) => index >= 0),
      };
    },
  });

  const unit = data?.unit;
  const bitsDone = data?.bitsDone ?? [];
  const activeBit = activeIndex !== null ? bits[activeIndex] : undefined;

  const planBits = (duration: number) => {
    const plan = buildBits(duration || 300);
    setBits(plan);
    const firstUnfinished = plan.findIndex((bit) => !bitsDone.includes(bit.index));
    const requested =
      startBit !== undefined && startBit >= 0 && startBit < plan.length ? startBit : null;
    setActiveIndex(requested ?? (firstUnfinished === -1 ? 0 : firstUnfinished));
  };

  const saveBit = async (bit: Bit) => {
    const { error } = await supabase.from("bit_progress").upsert(
      {
        user_id: userId,
        unit_id: unitId,
        bit_index: bit.index,
        bit_seconds: Math.round(bit.seconds),
      },
      { onConflict: "user_id,unit_id,bit_index" },
    );
    if (error) toast.error(error.message);
  };

  /** One bit finished: credit variable gems, maybe a chest, then advance. */
  const handleBitEnd = async () => {
    if (!activeBit || activeIndex === null) return;
    await saveBit(activeBit);
    const drop = rollBitReward();
    await awardGems(userId, drop.amount);
    setRunGems((value) => value + drop.amount);
    setRunBits((value) => value + 1);
    await queryClient.invalidateQueries({ queryKey: ["profile", userId] });

    const isLast = activeIndex + 1 >= bits.length;
    haptic("success");

    // Reduced-friction flow: after a few quick completions in a row we drop the
    // full-screen moment and keep the learner rolling with a light toast.
    const quick = recordCompletion();
    const remaining = bits.length - (activeIndex + 1);
    const showFull = isLast || shouldShowFullCelebration(quick, remaining);

    if (drop.kind === "chest") {
      setChest(drop);
      return;
    }
    if (isLast) {
      void finishVideo();
      return;
    }
    if (!showFull) {
      toast.success(`+${drop.amount} gems · lesson ${activeIndex + 2} up next`, { duration: 1400 });
    }
    advance();
  };

  const advance = () => {
    setActiveIndex((index) => (index === null ? null : index + 1));
  };

  const afterChest = () => {
    const wasMilestone = chest?.kind === "milestone";
    setChest(null);
    if (wasMilestone) {
      setCelebrating(true);
      return;
    }
    if (activeIndex !== null && activeIndex + 1 >= bits.length) void finishVideo();
    else advance();
  };

  /** Fires only when EVERY bit of the video is done. */
  const finishVideo = async () => {
    await supabase.from("bit_progress").upsert(
      {
        user_id: userId,
        unit_id: unitId,
        bit_index: UNIT_COMPLETE_BIT_INDEX,
        bit_seconds: 0,
      },
      { onConflict: "user_id,unit_id,bit_index" },
    );
    // Streak only extends on a real completion (with a one-day catch-up grace).
    const result = await completeStreakDay(userId);
    let milestoneChest: GemDrop | null = null;
    if (result.extended && streakMilestone(result.streak)) {
      const rolled = rollMilestoneChest(result.streak);
      milestoneChest = rolled;
      await awardGems(userId, rolled.amount);
      setRunGems((value) => value + rolled.amount);
    }
    if (unit?.video_id) clearPlayhead(unit.video_id);
    resetPace();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
      queryClient.invalidateQueries({ queryKey: ["path", userId] }),
      queryClient.invalidateQueries({ queryKey: ["unit", unitId, userId] }),
    ]);
    if (result.extended) {
      setPendingChest(milestoneChest);
      setStreakBeat(result);
      return;
    }
    if (milestoneChest) {
      setChest(milestoneChest);
      return;
    }
    setCelebrating(true);
  };

  /** After the streak beat: milestone chest first, then the celebration. */
  const afterStreakBeat = () => {
    setStreakBeat(null);
    if (pendingChest) {
      setChest(pendingChest);
      setPendingChest(null);
      return;
    }
    setCelebrating(true);
  };

  /** Song offer only ever appears after a full video. */
  const openSongOffer = async () => {
    setCelebrating(false);
    const [songs, queue] = await Promise.all([fetchSongs(userId), fetchQueue(userId)]);
    const taken = new Set(queue.map((entry) => entry.song_id));
    const candidates = songs.filter((song) => !taken.has(song.id));
    if (candidates.length === 0) {
      void navigate({ to: "/path" });
      return;
    }
    setSongOffer(candidates[Math.floor(Math.random() * candidates.length)]!);
  };

  const buySong = async (song: Song, mode: "video" | "audio") => {
    const ok = await unlockSong(userId, song);
    if (!ok) {
      toast.error("Not enough gems for that song yet.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    setSongOffer(null);
    haptic("success");
    if (mode === "audio") {
      playBackgroundAudio(song.video_id ?? "", { title: song.title });
      // Single play: the unlock is consumed immediately, so the next listen costs gems again.
      await relockSong(userId, song.id);
      toast.success("Playing in the background — one play per unlock.");
      void navigate({ to: "/path" });
      return;
    }
    setSongPlaying(song);
  };

  if (songPlaying) {
    return (
      <ImmersivePlayer
        videoId={songPlaying.video_id ?? ""}
        label={songPlaying.title}
        exitPrompt="Leave this song?"
        onSegmentEnd={() => {
          void relockSong(userId, songPlaying.id);
          void navigate({ to: "/path" });
        }}
        onExit={() => {
          void relockSong(userId, songPlaying.id);
          void navigate({ to: "/path" });
        }}
      />
    );
  }

  if (unit && unit.video_id && !isLoading) {
    return (
      <ImmersivePlayer
        key={`${unit.id}-${activeIndex ?? "init"}-${replayKey}`}
        videoId={unit.video_id}
        segment={activeBit ? { start: activeBit.start, end: activeBit.end } : undefined}
        label={`Bit ${(activeIndex ?? 0) + 1} / ${bits.length || "—"} · ${unit.title}`}
        sublabel={activeBit ? formatClock(activeBit.seconds) : ""}
        onDuration={(duration) => {
          if (bits.length === 0) planBits(duration);
        }}
        resume
        onSegmentEnd={() => void handleBitEnd()}
        onExit={() => {
          // Hand the video to the mini-player so it keeps playing while browsing.
          if (unit.video_id) mini.open({ videoId: unit.video_id, title: unit.title });
          void navigate({ to: "/path" });
        }}
        overlay={
          <>
            {chest && <ChestReveal drop={chest} onDone={afterChest} />}
            {streakBeat && (
              <StreakExtended
                streak={streakBeat.streak}
                usedCatchUp={streakBeat.usedCatchUp}
                onDone={afterStreakBeat}
              />
            )}
            {celebrating && (
              <CompletionCelebration
                gems={runGems}
                bits={runBits}
                streak={profile?.streak_count ?? 0}
                onContinue={() => void openSongOffer()}
                onReplay={() => {
                  setCelebrating(false);
                  setRunGems(0);
                  setRunBits(0);
                  setActiveIndex(0);
                  setReplayKey((value) => value + 1);
                }}
                onExit={() => void navigate({ to: "/path" })}
              />
            )}
            {songOffer && (
              <SongOffer
                song={songOffer}
                gems={profile?.gems ?? 0}
                onPlayVideo={() => void buySong(songOffer, "video")}
                onPlayAudio={() => void buySong(songOffer, "audio")}
                onSaveForLater={() => {
                  void saveSongForLater(userId, songOffer.id);
                  toast.success("Saved to your jukebox for later.");
                  setSongOffer(null);
                  void navigate({ to: "/path" });
                }}
                onDismiss={() => {
                  setSongOffer(null);
                  void navigate({ to: "/path" });
                }}
              />
            )}
          </>
        }
      />
    );
  }

  return (
    <AppShell>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading unit…</p>
      ) : (
        <p className="text-sm text-muted-foreground">This unit has no playable video.</p>
      )}
    </AppShell>
  );
}