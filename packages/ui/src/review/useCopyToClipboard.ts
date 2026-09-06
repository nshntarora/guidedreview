import { useCallback, useEffect, useRef, useState } from "react";

/** How long the "Copied" confirmation stays up before reverting. */
const COPIED_RESET_MS = 2000;

/**
 * Copy text and flag it for a couple of seconds so a button can read "Copied".
 * Shared by the options GitHub section and the overlay's Connect GitHub modal.
 *
 * A failed write (no permission, insecure context) leaves `copied` false so the
 * label never claims a copy that did not happen — the user can still select the
 * code by hand.
 */
export function useCopyToClipboard(resetAfterMs: number = COPIED_RESET_MS): {
  copied: boolean;
  copy: (text: string) => Promise<void>;
  resetCopied: () => void;
} {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Without this, the timer fires after the modal closes and flips state on an
  // unmounted component.
  useEffect(() => clearTimer, [clearTimer]);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        clearTimer();
        setCopied(true);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setCopied(false);
        }, resetAfterMs);
      } catch {
        clearTimer();
        setCopied(false);
      }
    },
    [clearTimer, resetAfterMs],
  );

  const resetCopied = useCallback(() => {
    clearTimer();
    setCopied(false);
  }, [clearTimer]);

  return { copied, copy, resetCopied };
}
