import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "bitquest-install-dismissed";

/** Mobile install nudge. Uses the native prompt when the browser offers one. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const isMobile = window.matchMedia("(max-width: 820px)").matches;
    if (!isMobile) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIos) {
      setIosHint(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-3 shadow-chunky transition-all">
      <img src="/images/icon-512.png" alt="" width={44} height={44} className="rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-extrabold">Install BitQuest</p>
        <p className="truncate text-xs text-muted-foreground">
          {iosHint ? "Tap Share, then “Add to Home Screen”." : "Learn in bits, straight from your home screen."}
        </p>
      </div>
      {!iosHint && (
        <button
          type="button"
          onClick={async () => {
            await deferred?.prompt();
            dismiss();
          }}
          className="btn-chunky flex items-center gap-1 bg-primary px-3 py-2 text-xs text-primary-foreground"
        >
          <Download className="size-4" /> Install
        </button>
      )}
      <button type="button" aria-label="Dismiss" onClick={dismiss} className="text-muted-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}