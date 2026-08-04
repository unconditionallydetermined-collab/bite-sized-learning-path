import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Globe, Smartphone } from "lucide-react";

import { Mascot } from "@/components/Mascot";

export const APK_URL = "/downloads/bitquest.apk";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download the BitQuest Android app" },
      {
        name: "description",
        content:
          "Grab the wrapped BitQuest Android APK for a native app feel, or keep using the full web version in your browser.",
      },
      { property: "og:title", content: "Download the BitQuest Android app" },
      {
        property: "og:description",
        content: "Install the wrapped BitQuest APK directly — no app store needed.",
      },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <div className="screen-in flex flex-col items-center gap-4 text-center">
        <Mascot mood="happy" size={120} className="drift" />
        <h1 className="text-3xl">Get BitQuest on Android</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This is the same BitQuest, wrapped as a real installable Android app. The website keeps
          working exactly as it does now — the APK is just an extra way to run it.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <a
          href={APK_URL}
          download
          className="btn-chunky flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 text-sm text-primary-foreground"
        >
          <Download className="size-5" /> Download APK
        </a>
        <div className="rounded-3xl border-2 border-border bg-card p-5 text-sm shadow-chunky-sm">
          <h2 className="flex items-center gap-2 text-base">
            <Smartphone className="size-4 text-primary" /> Installing
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>Tap Download APK and let the file finish saving.</li>
            <li>Open it from your notifications or Files app.</li>
            <li>
              Allow “install unknown apps” for your browser when Android asks — the app is not
              distributed through the Play Store.
            </li>
            <li>
              Long-press the installed icon for the “Start a lesson” quick action to jump straight
              into a bit.
            </li>
          </ol>
        </div>
        <Link
          to="/"
          className="btn-chunky flex w-full items-center justify-center gap-2 bg-secondary px-5 py-4 text-sm text-secondary-foreground"
        >
          <Globe className="size-4" /> Keep using the web version
        </Link>
      </div>
    </main>
  );
}
