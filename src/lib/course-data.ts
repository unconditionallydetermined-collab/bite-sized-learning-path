import { supabase } from "@/integrations/supabase/client";
import { parseCourseText, type ParseResult } from "@/lib/parser";

export const UNIT_COMPLETE_BIT_INDEX = -1;

export type UnitRow = {
  id: string;
  quest_id: string;
  title: string;
  youtube_url: string;
  video_id: string | null;
  position: number;
};

export type PathModule = {
  id: string;
  title: string;
  position: number;
  isMixed: boolean;
  status: "active" | "completed" | "skipped";
  units: Array<UnitRow & { questTitle: string; completed: boolean; bitsDone: number[] }>;
};

export async function fetchPath(userId: string): Promise<PathModule[]> {
  const [quests, units, modules, moduleUnits, moduleProgress, bits] = await Promise.all([
    supabase.from("quests").select("id, title, position").eq("user_id", userId),
    supabase
      .from("units")
      .select("id, quest_id, title, youtube_url, video_id, position")
      .eq("user_id", userId),
    supabase.from("modules").select("id, title, position, is_mixed").eq("user_id", userId),
    supabase.from("module_units").select("module_id, unit_id, position").eq("user_id", userId),
    supabase.from("module_progress").select("module_id, status").eq("user_id", userId),
    supabase.from("bit_progress").select("unit_id, bit_index").eq("user_id", userId),
  ]);

  const questTitles = new Map((quests.data ?? []).map((quest) => [quest.id, quest.title]));
  const unitsById = new Map((units.data ?? []).map((unit) => [unit.id, unit]));
  const statuses = new Map((moduleProgress.data ?? []).map((row) => [row.module_id, row.status]));

  const bitsByUnit = new Map<string, number[]>();
  for (const row of bits.data ?? []) {
    const list = bitsByUnit.get(row.unit_id) ?? [];
    list.push(row.bit_index);
    bitsByUnit.set(row.unit_id, list);
  }

  return (modules.data ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((module) => {
      const links = (moduleUnits.data ?? [])
        .filter((link) => link.module_id === module.id)
        .sort((a, b) => a.position - b.position);

      const moduleUnitList = links.flatMap((link) => {
        const unit = unitsById.get(link.unit_id);
        if (!unit) return [];
        const done = bitsByUnit.get(unit.id) ?? [];
        return [
          {
            ...unit,
            questTitle: questTitles.get(unit.quest_id) ?? "Quest",
            completed: done.includes(UNIT_COMPLETE_BIT_INDEX),
            bitsDone: done.filter((index) => index >= 0).sort((a, b) => a - b),
          },
        ];
      });

      const stored = statuses.get(module.id);
      const allDone =
        moduleUnitList.length > 0 && moduleUnitList.every((unit) => unit.completed);
      const status: PathModule["status"] =
        stored === "skipped" ? "skipped" : allDone || stored === "completed" ? "completed" : "active";

      return {
        id: module.id,
        title: module.title,
        position: module.position,
        isMixed: module.is_mixed,
        status,
        units: moduleUnitList,
      };
    });
}

/** Appends parsed quests/units/modules without touching existing rows or progress. */
export async function importCourseText(userId: string, text: string): Promise<ParseResult> {
  const parsed = parseCourseText(text);
  if (parsed.quests.length === 0) {
    throw new Error("No quests found. Check the format and try again.");
  }

  const [{ count: questCount }, { count: moduleCount }] = await Promise.all([
    supabase.from("quests").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("modules").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const questOffset = questCount ?? 0;
  const moduleOffset = moduleCount ?? 0;

  const { data: insertedQuests, error: questError } = await supabase
    .from("quests")
    .insert(
      parsed.quests.map((quest, index) => ({
        user_id: userId,
        title: quest.title,
        position: questOffset + index,
      })),
    )
    .select("id, position");
  if (questError) throw questError;

  const questIds = (insertedQuests ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((quest) => quest.id);

  const unitRows = parsed.quests.flatMap((quest, questIndex) =>
    quest.units.map((unit) => ({
      user_id: userId,
      quest_id: questIds[questIndex]!,
      title: unit.title,
      youtube_url: unit.youtubeUrl,
      video_id: unit.videoId,
      position: unit.order,
      ref: `${questIndex}:${unit.order}`,
    })),
  );

  const { data: insertedUnits, error: unitError } = await supabase
    .from("units")
    .insert(unitRows.map(({ ref: _ref, ...row }) => row))
    .select("id, quest_id, position");
  if (unitError) throw unitError;

  const unitIdByRef = new Map<string, string>();
  for (const row of unitRows) {
    const match = (insertedUnits ?? []).find(
      (inserted) => inserted.quest_id === row.quest_id && inserted.position === row.position,
    );
    if (match) unitIdByRef.set(row.ref, match.id);
  }

  const { data: insertedModules, error: moduleError } = await supabase
    .from("modules")
    .insert(
      parsed.modules.map((module, index) => ({
        user_id: userId,
        title: module.title,
        is_mixed: module.isMixed,
        position: moduleOffset + index,
      })),
    )
    .select("id, position");
  if (moduleError) throw moduleError;

  const moduleIds = (insertedModules ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((module) => module.id);

  const links = parsed.modules.flatMap((module, moduleIndex) =>
    module.unitRefs.flatMap((ref, position) => {
      const unitId = unitIdByRef.get(ref);
      if (!unitId) return [];
      return [
        {
          user_id: userId,
          module_id: moduleIds[moduleIndex]!,
          unit_id: unitId,
          position,
        },
      ];
    }),
  );

  if (links.length > 0) {
    const { error: linkError } = await supabase.from("module_units").insert(links);
    if (linkError) throw linkError;
  }

  await supabase.from("profiles").update({ onboarded: true }).eq("id", userId);

  return parsed;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Bumps the daily streak based on the learner's local calendar day. */
export async function touchStreak(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("streak_count, longest_streak, last_active_date, streak_freezes")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return;

  const today = new Date();
  const todayKey = localDateKey(today);
  if (profile.last_active_date === todayKey) return;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const continued = profile.last_active_date === localDateKey(yesterday);

  // A held streak freeze auto-applies on the first missed day, so the streak
  // continues instead of resetting.
  const freezes = Number(profile.streak_freezes ?? 0);
  const usesFreeze = !continued && profile.last_active_date !== null && freezes > 0;
  const streak = continued || usesFreeze ? profile.streak_count + 1 : 1;

  await supabase
    .from("profiles")
    .update({
      streak_count: streak,
      longest_streak: Math.max(streak, profile.longest_streak),
      last_active_date: todayKey,
      streak_freezes: usesFreeze ? freezes - 1 : freezes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}