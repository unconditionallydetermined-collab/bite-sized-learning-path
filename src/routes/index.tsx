import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Clock, Download, Flame, Shuffle, Sparkles } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BitQuest — Micro-learning quests from any video course" },
      {
        name: "description",
        content:
          "Paste any video course and BitQuest turns it into 60-90 second actionable bits, quests, and streaks. Installable on your phone.",
      },
      { property: "og:title", content: "BitQuest — Micro-learning quests from any video course" },
      {
        property: "og:description",
        content: "Turn long videos into bite-size quests with streaks, mixed modules, and a custom player.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Sparkles, title: "Paste and go", body: "Raw course text becomes quests, units, and modules." },
  { icon: Clock, title: "60-90s bits", body: "Every unit is chopped into actionable bits you can finish." },
  { icon: Shuffle, title: "Mixed modules", body: "Units from different quests get combined automatically." },
  { icon: Flame, title: "Daily streaks", body: "Show up every day and keep the flame alive." },
];

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/path", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-5 py-14">
        <img
          src="/images/icon-512.png"
          alt="BitQuest app icon"
          width={84}
          height={84}
          className="rounded-3xl shadow-chunky"
        />
        <h1 className="mt-6 text-4xl leading-tight">
          Learn any course in <span className="text-primary">tiny bits</span>.
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Paste your course text, and BitQuest builds a Duolingo-style path of 60-90 second learning
          bits with streaks, quests, and a distraction-free player.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="btn-chunky bg-primary px-6 py-3.5 text-sm text-primary-foreground"
          >
            Start free
          </Link>
          <Link to="/auth" className="btn-chunky bg-secondary px-6 py-3.5 text-sm text-secondary-foreground">
            I have an account
          </Link>
          <Link
            to="/download"
            className="btn-chunky flex items-center gap-2 bg-gold px-6 py-3.5 text-sm text-gold-foreground"
          >
            <Download className="size-4" /> Download Android app
          </Link>
        </div>

        <ul className="mt-12 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="rounded-3xl border-2 border-border bg-card p-5">
              <feature.icon className="size-5 text-primary" />
              <h2 className="mt-3 font-display text-lg">{feature.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
