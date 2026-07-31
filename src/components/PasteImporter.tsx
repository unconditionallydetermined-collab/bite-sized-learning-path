import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { parseCourseText } from "@/lib/parser";

const SAMPLE = `Quest 1: How to get clients
Modules / Units:
How to get clients (1) -> https://youtu.be/dQw4w9WgXcQ
Quest 2: Subtitles
Modules / Units:
Subtitles (1) -> [https://youtu.be/aqz-KE-bpKQ]`;

export function PasteImporter({
  submitLabel,
  pending,
  onSubmit,
}: {
  submitLabel: string;
  pending: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const preview = useMemo(() => (text.trim() ? parseCourseText(text) : null), [text]);

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={10}
        spellCheck={false}
        placeholder={SAMPLE}
        className="w-full rounded-2xl border-2 border-input bg-card p-4 font-mono text-xs leading-relaxed outline-none transition-colors focus:border-ring"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !preview || preview.quests.length === 0}
          onClick={() => onSubmit(text)}
          className="btn-chunky flex items-center gap-2 bg-primary px-5 py-3 text-sm text-primary-foreground disabled:cursor-not-allowed"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={() => setText(SAMPLE)}
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          Use sample text
        </button>
      </div>

      {preview && (
        <div className="rounded-2xl border-2 border-border bg-secondary/50 p-4 text-sm">
          <p className="font-display text-xs uppercase tracking-widest text-secondary-foreground">
            Parser preview
          </p>
          <p className="mt-2">
            {preview.quests.length} quests · {preview.unitCount} units ·{" "}
            {preview.modules.length} generated modules (
            {preview.modules.filter((module) => module.isMixed).length} mixed)
          </p>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {preview.modules.slice(0, 8).map((module) => (
              <li key={module.title}>
                {module.isMixed ? "🔀" : "📘"} {module.title} — {module.unitRefs.length} unit(s)
              </li>
            ))}
          </ul>
          {preview.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-destructive">
              {preview.errors.slice(0, 5).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}