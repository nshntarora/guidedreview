import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildFileReviewPlan, getProvider, type ProviderId } from "@guided-review/core";
import type { ReviewSessionPayload } from "../server/createServer";
import { Overlay } from "@extension/content/overlay/Overlay";
import { ReviewHostProvider, setActiveReviewHost } from "@extension/content/overlay/host";
import { restoreSession, useReviewStore } from "@extension/content/overlay/store";
import type { LocalDiffControls } from "@extension/content/overlay/localReview";
import { createLocalReviewHost } from "./host";
import { codingAgentLabel } from "./codingAgentLabel";
import { SettingsPanel } from "./SettingsPanel";

function tokenFromLocation(): string {
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export function App() {
  const token = tokenFromLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [commits, setCommits] = useState<ReviewSessionPayload["commits"]>([]);
  const [scopes, setScopes] = useState<ReviewSessionPayload["scopes"]>([]);
  const [selectedScope, setSelectedScope] = useState("");
  const [structured, setStructured] = useState(false);
  const [scopeBusy, setScopeBusy] = useState(false);
  const cancelStreamRef = useRef<(() => void) | undefined>(undefined);
  const hasKeyRef = useRef(false);
  const providerIdRef = useRef<ProviderId>("anthropic");
  const codingAgentRef = useRef<string | null>(null);

  const host = useMemo(
    () =>
      createLocalReviewHost({
        token,
        onConnectProvider: () => setSettingsOpen(true),
      }),
    [token],
  );
  setActiveReviewHost(host);

  const applyMeta = useCallback((session: ReviewSessionPayload) => {
    setCommits(session.commits);
    setScopes(session.scopes);
    setSelectedScope(session.selectedScope);
    useReviewStore.getState().open();
    useReviewStore.getState().setPRContext(session.context);
  }, []);

  const installFilePlan = useCallback(
    (session: ReviewSessionPayload) => {
      applyMeta(session);
      useReviewStore.getState().bootReady({
        sessionKey: session.sessionKey,
        diff: session.diff,
        plan: buildFileReviewPlan(session.diff),
      });
      setStructured(false);
    },
    [applyMeta],
  );

  const startStructure = useCallback(() => {
    const { diff, prContext } = useReviewStore.getState();
    if (!diff || !prContext) return;
    if (!hasKeyRef.current) {
      host.connectProvider();
      return;
    }
    cancelStreamRef.current?.();
    const generation = useReviewStore.getState().beginRetry();
    const agentLabel = codingAgentLabel(codingAgentRef.current);
    useReviewStore
      .getState()
      .setProviderLabel(agentLabel ?? getProvider(providerIdRef.current).displayName);
    const { cancel } = host.streamPlan(diff, prContext, {
      onStatus: (phase) => useReviewStore.getState().setBuildPhase(phase, generation),
      onUnit: (unit) => useReviewStore.getState().appendUnit(unit, generation),
      onDone: (plan) => {
        useReviewStore.getState().setReady(diff, plan, generation);
        setStructured(true);
      },
      onError: (error) => {
        if (error.code === "no_api_key") {
          host.connectProvider();
          const sessionKey = useReviewStore.getState().sessionKey ?? "local";
          useReviewStore.getState().bootReady({
            sessionKey,
            diff,
            plan: buildFileReviewPlan(diff),
          });
          return;
        }
        useReviewStore.getState().setError(error, generation);
      },
    });
    cancelStreamRef.current = cancel;
  }, [host]);

  useEffect(() => {
    if (!token) {
      setBootError("Missing session token. Open the URL printed by the CLI.");
      return;
    }

    let cancelled = false;

    async function boot() {
      const res = await fetch(`/api/session?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Could not load the review (${res.status}).`);
      }
      const session = (await res.json()) as ReviewSessionPayload;
      if (cancelled) return;

      hasKeyRef.current = session.settings.hasKey;
      providerIdRef.current = session.settings.provider;
      codingAgentRef.current = session.settings.codingAgent ?? null;
      if (session.settings.hasKey) {
        const agentLabel = codingAgentLabel(codingAgentRef.current);
        useReviewStore
          .getState()
          .setProviderLabel(agentLabel ?? getProvider(session.settings.provider).displayName);
      }

      applyMeta(session);
      const restored = await restoreSession(session.sessionKey);
      if (cancelled) return;
      if (restored) {
        setStructured(true);
        return;
      }
      installFilePlan(session);
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
      cancelStreamRef.current?.();
    };
  }, [applyMeta, installFilePlan, token]);

  async function selectScope(scope: string) {
    if (!token || scope === selectedScope || scopeBusy) return;
    setScopeBusy(true);
    cancelStreamRef.current?.();
    cancelStreamRef.current = undefined;
    try {
      const res = await fetch(`/api/diff?token=${encodeURIComponent(token)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const body = (await res.json().catch(() => ({}))) as ReviewSessionPayload & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? `Could not load that diff (${res.status}).`);
      }
      installFilePlan(body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not load that diff.";
      useReviewStore.getState().setError(message);
    } finally {
      setScopeBusy(false);
    }
  }

  const status = useReviewStore((s) => s.status);
  const localDiff: LocalDiffControls = {
    scopes,
    selectedScope,
    commits,
    onSelectScope: (id) => {
      void selectScope(id);
    },
    onStructureReview: startStructure,
    structuring: status === "loading" || status === "streaming",
    structured,
    scopeBusy,
  };

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
        allowExit={false}
        localDiff={localDiff}
        onRetry={() => {
          const { diff, prContext } = useReviewStore.getState();
          if (!diff || !prContext) {
            window.location.reload();
            return;
          }
          startStructure();
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
