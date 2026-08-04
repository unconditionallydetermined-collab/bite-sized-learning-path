import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PasteImporter } from "@/components/PasteImporter";
import { useAuth } from "@/hooks/useAuth";
import { importCourseText, importVideoLinks } from "@/lib/course-data";

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
  const [bulkLinks, setBulkLinks] = useState("");
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkPending, setBulkPending] = useState(false);

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

  const submitLinks = async () => {
    if (!user) return;
    setBulkPending(true);
    try {
      const result = await importVideoLinks(user.id, bulkTitle, bulkLinks);
      toast.success(`Added ${result.unitCount} video(s).`);
      setBulkLinks("");
      setBulkTitle("");
      await queryClient.invalidateQueries({ queryKey: ["path", user.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBulkPending(false);
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

      {/* Bulk link ingestion — one link or many, comma or newline separated. */}
      <div className="mt-8 rounded-3xl border-2 border-border bg-card p-5 shadow-chunky-sm">
        <h2 className="text-base">Or just paste video links</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          One link at a time, or several at once separated by commas. Each becomes its own unit.
        </p>
        <input
          value={bulkTitle}
          onChange={(event) => setBulkTitle(event.target.value)}
          placeholder="Quest name (optional)"
          className="mt-3 w-full rounded-2xl border-2 border-input bg-background p-3 text-sm outline-none focus:border-ring"
        />
        <textarea
          value={bulkLinks}
          onChange={(event) => setBulkLinks(event.target.value)}
          rows={3}
          placeholder="https://youtu.be/aaa, https://youtu.be/bbb"
          className="mt-3 w-full rounded-2xl border-2 border-input bg-background p-3 text-sm outline-none focus:border-ring"
        />
        <button
          type="button"
          disabled={bulkPending || bulkLinks.trim().length === 0}
          onClick={() => void submitLinks()}
          className="btn-chunky mt-3 bg-primary px-4 py-3 text-sm text-primary-foreground disabled:cursor-not-allowed"
        >
          {bulkPending ? "Adding…" : "Add these videos"}
        </button>
      </div>
    </AppShell>
  );
}