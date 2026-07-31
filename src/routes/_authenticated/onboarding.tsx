import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PasteImporter } from "@/components/PasteImporter";
import { useAuth } from "@/hooks/useAuth";
import { importCourseText } from "@/lib/course-data";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Build your path — BitQuest" },
      {
        name: "description",
        content: "Paste your raw course text and BitQuest turns it into quests, units, and modules.",
      },
      { property: "og:title", content: "Build your path — BitQuest" },
      {
        property: "og:description",
        content: "Turn pasted course text into a gamified micro-learning path in seconds.",
      },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pending, setPending] = useState(false);

  const submit = async (text: string) => {
    if (!user) return;
    setPending(true);
    try {
      const result = await importCourseText(user.id, text);
      toast.success(`Imported ${result.quests.length} quests and ${result.unitCount} units.`);
      void navigate({ to: "/path" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl">Paste your course</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop in your raw quest text. We'll build quests, units, and mixed modules for you.
        </p>
      </div>
      <PasteImporter submitLabel="Build my path" pending={pending} onSubmit={(text) => void submit(text)} />
    </AppShell>
  );
}