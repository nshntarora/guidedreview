import { useEffect, useMemo, useState } from "react";
import { buildFileReviewPlan, getProvider } from "@guided-review/core";
import type { ReviewSessionPayload } from "../server/createServer";
import { Overlay } from "@extension/content/overlay/Overlay";
import { ReviewHostProvider, setActiveReviewHost } from "@extension/content/overlay/host";
import { restoreSession, useReviewStore } from "@extension/content/overlay/store";
import { createLocalReviewHost } from "./host";
import { SettingsPanel } from "./SettingsPanel";

function tokenFromLocation(): string {
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export function App() {
  const token = tokenFromLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  const host = useMemo(
    () =>
      createLocalReviewHost({
        token,
        onConnectProvider: () => setSettingsOpen(true),
      }),
    [token],
  );
  setActiveReviewHost(host);

  useEffect(() => {
    if (!token) {
      setBootError("Missing session token. Open the URL printed by the CLI.");
      return;
    }

    let cancelled = false;
    let cancelStream: (() => void) | undefined;

    async function boot() {
      const res = await fetch(`/api/session?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Could not load the review (${res.status}).`);
      }
      const session = (await res.json()) as ReviewSessionPayload;
      if (cancelled) return;

      const store = useReviewStore.getState();
      store.open();
      store.setPRContext(session.context);
      store.startLoading(session.sessionKey);
      const generation = store.streamGeneration;

      const restored = await restoreSession(session.sessionKey);
      if (cancelled || restored) return;

      store.setDiff(session.diff);

      if (!session.settings.hasKey) {
        store.setNeedsProvider();
        return;
      }

      store.setProviderLabel(getProvider(session.settings.provider).displayName);
      store.beginStreaming(generation);
      const { cancel } = host.streamPlan(session.diff, session.context, {
        onStatus: (phase) => useReviewStore.getState().setBuildPhase(phase, generation),
        onUnit: (unit) => useReviewStore.getState().appendUnit(unit, generation),
        onDone: (plan) => useReviewStore.getState().setReady(session.diff, plan, generation),
        onError: (error) => {
          if (error.code === "no_api_key") {
            useReviewStore.getState().setNeedsProvider();
            return;
          }
          useReviewStore.getState().setError(error, generation);
        },
      });
      cancelStream = cancel;
    }

    void boot().catch((error: unknown) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : "Failed to start the review.";
      setBootError(message);
      useReviewStore.getState().setError(message);
      useReviewStore.getState().open();
    });

    return () => {
      cancelled = true;
      cancelStream?.();
    };
  }, [host, token]);

  if (bootError && !useReviewStore.getState().isOpen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
        <p>{bootError}</p>
      </div>
    );
  }

  return (
    <ReviewHostProvider host={host}>
      <Overlay
        onRetry={() => {
          const { diff, prContext } = useReviewStore.getState();
          if (!diff || !prContext) {
            window.location.reload();
            return;
          }
          if (!useReviewStore.getState().needsProvider && !token) return;
          const generation = useReviewStore.getState().beginRetry();
          if (!useReviewStore.getState().needsProvider) {
            useReviewStore.getState().setReady(diff, buildFileReviewPlan(diff), generation);
          }
          window.location.reload();
        }}
      />
      {settingsOpen && (
        <SettingsPanel
          token={token}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            window.location.reload();
          }}
        />
      )}
    </ReviewHostProvider>
  );
}
