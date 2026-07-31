import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { BitPlayer } from "@/components/BitPlayer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Bit } from "@/lib/bits";

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
        bitsDone: (bitResult.data ?? []).map((row) => row.bit_index),
      };
    },
  });

  const unit = data?.unit;

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
    else void queryClient.invalidateQueries({ queryKey: ["unit", unitId, userId] });
  };

  const finishUnit = async () => {
    toast.success("Unit complete! Nice work.");
    await queryClient.invalidateQueries({ queryKey: ["path", userId] });
    void navigate({ to: "/path" });
  };

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => void navigate({ to: "/path" })}
        className="mb-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" /> Back to path
      </button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading unit…</p>
      ) : !unit ? (
        <p className="text-sm text-muted-foreground">This unit could not be found.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {unit.quests?.title ?? "Quest"}
            </p>
            <h1 className="text-xl">{unit.title}</h1>
          </div>
          <BitPlayer
            videoId={unit.video_id ?? ""}
            completedBits={data?.bitsDone ?? []}
            startBit={startBit}
            onBitComplete={(bit) => void saveBit(bit)}
            onUnitComplete={() => void finishUnit()}
          />
        </div>
      )}
    </AppShell>
  );
}