import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PasteImporter } from "@/components/PasteImporter";
import { useAuth } from "@/hooks/useAuth";
import { importCourseText } from "@/lib/course-data";

export const Route = createFileRoute("/_authenticated/settings/profile/advanced/content-library")({
  head: () => ({
    meta: [
      { title: "Content library — BitQuest" },
      {
        name: "description",
        content: "Append new quests and units to your BitQuest path without losing progress.",
      },
      { property: "og:title", content: "Content library — BitQuest" },
      {
        property: "og:description",
        content: "Paste more course text to add quests and units to your existing path.",
      },
    ],
  }),
  component: ContentLibraryPage,
});

function ContentLibraryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const submit = async (text: string) => {
    if (!user) return;
    setPending(true);
    try {
      const result = await importCourseText(user.id, text);
      toast.success(`Added ${result.quests.length} quests and ${result.unitCount} units.`);
      await queryClient.invalidateQueries({ queryKey: ["path", user.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl">Add more quests</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Pasting here appends new quests, units, and modules. Existing progress and streaks stay
        untouched.
      </p>
      <PasteImporter
        submitLabel="Append to my path"
        pending={pending}
        onSubmit={(text) => void submit(text)}
      />
    </AppShell>
  );
}