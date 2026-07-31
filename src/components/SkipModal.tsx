import { useState } from "react";
import { AlertTriangle } from "lucide-react";

const REQUIRED_PHRASE = "I want to skip";

/**
 * High-friction skipping: 3 deliberate steps before a module can be skipped.
 * Step 1 warning -> step 2 type the phrase -> step 3 final confirm.
 */
export function SkipModal({
  moduleTitle,
  onClose,
  onConfirm,
}: {
  moduleTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phrase, setPhrase] = useState("");
  const phraseOk = phrase.trim().toLowerCase() === REQUIRED_PHRASE.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl border-2 border-border bg-card p-6 shadow-chunky node-pop">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          <span className="font-display text-xs uppercase tracking-widest">
            Step {step} of 3
          </span>
        </div>

        {step === 1 && (
          <>
            <h2 className="mt-3 text-xl">Skip “{moduleTitle}”?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Skipping breaks the learning chain. The bits in this module stay unfinished and
              your path shows the gap.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-chunky bg-primary px-4 py-3 text-sm text-primary-foreground"
              >
                Keep learning
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-destructive"
              >
                I still want to skip
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="mt-3 text-xl">Type it out</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Type <span className="font-bold text-foreground">{REQUIRED_PHRASE}</span> to continue.
            </p>
            <input
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              placeholder={REQUIRED_PHRASE}
              className="mt-4 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-ring"
            />
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                disabled={!phraseOk}
                onClick={() => setStep(3)}
                className="btn-chunky bg-destructive px-4 py-3 text-sm text-destructive-foreground disabled:cursor-not-allowed"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="mt-3 text-xl">Final confirmation</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This marks the module as skipped. You can still come back to it later, but it will
              count against your completion.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={onConfirm}
                className="btn-chunky bg-destructive px-4 py-3 text-sm text-destructive-foreground"
              >
                Yes, skip this module
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Take me back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}