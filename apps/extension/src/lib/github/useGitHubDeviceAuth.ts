import { useCallback, useEffect, useRef, useState } from "react";
import type { GitHubAuthState } from "@extension/lib/types";
import { pollGitHubDeviceAuth, startGitHubDeviceAuth } from "@extension/lib/messaging";

/** In-progress device OAuth UI state owned by the caller’s poll loop. */
type DeviceAuthFlowView =
  | { kind: "idle" }
  | {
      kind: "awaiting";
      userCode: string;
      verificationUri: string;
      deviceCode: string;
    }
  | { kind: "error"; message: string };

interface UseGitHubDeviceAuthOptions {
  /** When false, connect is a no-op (OAuth client not configured). */
  enabled?: boolean;
  /** Called after the background worker persists the token. */
  onAuthorized?: (auth: GitHubAuthState) => void;
}

/**
 * Open GitHub’s device verification page. Prefers chrome.tabs (extension pages);
 * falls back to window.open for content scripts.
 */
export async function openVerificationUri(uri: string): Promise<void> {
  try {
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      await chrome.tabs.create({ url: uri });
      return;
    }
  } catch {
    // Missing tabs permission / popup block — try window.open next.
  }
  try {
    window.open(uri, "_blank", "noopener,noreferrer");
  } catch {
    // Caller still shows a verification link the user can click.
  }
}

/**
 * Device OAuth connect + poll loop (MV3-friendly: timer lives in the UI context).
 * Shared by Options and the overlay Connect GitHub modal.
 */
export function useGitHubDeviceAuth(options: UseGitHubDeviceAuthOptions = {}): {
  flow: DeviceAuthFlowView;
  busy: boolean;
  startConnect: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
} {
  const { enabled = true, onAuthorized } = options;
  const [flow, setFlow] = useState<DeviceAuthFlowView>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollGenerationRef = useRef(0);
  const onAuthorizedRef = useRef(onAuthorized);
  onAuthorizedRef.current = onAuthorized;

  const stopPolling = useCallback(() => {
    pollGenerationRef.current += 1;
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const schedulePoll = useCallback(
    (deviceCode: string, intervalSec: number, generation: number) => {
      if (pollTimerRef.current !== null) {
        clearTimeout(pollTimerRef.current);
      }
      pollTimerRef.current = setTimeout(
        () => {
          void (async () => {
            if (generation !== pollGenerationRef.current) return;

            try {
              const result = await pollGitHubDeviceAuth(deviceCode);
              if (generation !== pollGenerationRef.current) return;

              if (result.ok && result.status === "pending") {
                schedulePoll(deviceCode, intervalSec, generation);
                return;
              }

              if (result.ok && result.status === "slow_down") {
                schedulePoll(deviceCode, result.interval, generation);
                return;
              }

              if (result.ok && result.status === "authorized") {
                stopPolling();
                setBusy(false);
                setFlow({ kind: "idle" });
                onAuthorizedRef.current?.(result.auth);
                return;
              }

              stopPolling();
              setBusy(false);
              const message = !result.ok
                ? result.error
                : "GitHub authorization failed. Try connecting again.";
              setFlow({ kind: "error", message });
            } catch (error) {
              if (generation !== pollGenerationRef.current) return;
              stopPolling();
              setBusy(false);
              const message =
                error instanceof Error
                  ? error.message
                  : "GitHub authorization failed unexpectedly.";
              setFlow({ kind: "error", message });
            }
          })();
        },
        Math.max(0, intervalSec) * 1000,
      );
    },
    [stopPolling],
  );

  const startConnect = useCallback(async () => {
    if (!enabled || busy) return;
    stopPolling();
    setBusy(true);
    setFlow({ kind: "idle" });

    try {
      const start = await startGitHubDeviceAuth();
      if (!start.ok) {
        setBusy(false);
        setFlow({ kind: "error", message: start.error });
        return;
      }

      setFlow({
        kind: "awaiting",
        userCode: start.userCode,
        verificationUri: start.verificationUri,
        deviceCode: start.deviceCode,
      });

      // Caller shows the user code and opens verificationUri when ready
      // (primary button or auto-open after copy).

      const generation = pollGenerationRef.current;
      schedulePoll(start.deviceCode, start.interval, generation);
    } catch (error) {
      setBusy(false);
      const message = error instanceof Error ? error.message : "Could not start GitHub sign-in.";
      setFlow({ kind: "error", message });
    }
  }, [busy, enabled, schedulePoll, stopPolling]);

  const cancel = useCallback(() => {
    stopPolling();
    setBusy(false);
    setFlow({ kind: "idle" });
  }, [stopPolling]);

  return {
    flow,
    busy,
    startConnect,
    cancel,
    reset: cancel,
  };
}
