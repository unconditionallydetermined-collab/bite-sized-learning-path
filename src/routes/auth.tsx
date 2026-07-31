import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — BitQuest Micro-Learning" },
      {
        name: "description",
        content:
          "Log in to BitQuest to build your quest path and learn in 60-90 second actionable bits.",
      },
      { property: "og:title", content: "Sign in — BitQuest Micro-Learning" },
      {
        property: "og:description",
        content: "Log in to keep your streak and continue your micro-learning quests.",
      },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/path", replace: true });
  }, [loading, session, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }

    setPending(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created! Let's build your path.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Welcome back!");
      }
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <img
            src="/images/icon-512.png"
            alt="BitQuest"
            width={72}
            height={72}
            className="mx-auto rounded-2xl shadow-chunky"
          />
          <h1 className="mt-4 text-2xl">{mode === "signup" ? "Start your quest" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Create an account, then paste your course text."
              : "Log in to continue your streak."}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border-2 border-input bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-ring"
          />
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password (min 8 characters)"
            className="w-full rounded-2xl border-2 border-input bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-ring"
          />
          <button
            type="submit"
            disabled={pending}
            className="btn-chunky flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-sm text-primary-foreground"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-5 w-full text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          {mode === "signup" ? "I already have an account" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}