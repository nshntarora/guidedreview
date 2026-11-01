import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProvider, type ProviderId } from "@guided-review/core";
import type { ReviewSessionPayload } from "../server/createServer";
import { Overlay } from "@guided-review/ui/review/Overlay";
import { ReviewHostProvider } from "@guided-review/ui/review/host";
import { persistSession, restoreSession, useReviewStore } from "@guided-review/ui/review/store";
import type { LocalDiffControls } from "@guided-review/ui/review/localReview";
import { createLocalReviewHost } from "./host";
import { codingAgentLabel } from "./codingAgentLabel";
import { SettingsApp } from "./settings/SettingsApp";
import type { PublicSettings } from "./settings/Settings";

type AppRoute = "review" | "settings" | "about";

function parseAppHash(hash: string): AppRoute {
  const path = hash.replace(/^#\/?/, "").toLowerCase();
  if (path === "settings" || path === "about") return path;
  return "review";
}

function useHashRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== "undefined" ? parseAppHash(window.location.hash) : "review",
  );

  useEffect(() => {
    const onHashChange = () => setRoute(parseAppHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

export function App() {
  const route = useHashRoute();
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [commits, setCommits] = useState<ReviewSessionPayload["commits"]>([]);
  const [totalCommits, setTotalCommits] = useState(0);
  const [scopes, setScopes] = useState<ReviewSessionPayload["scopes"]>([]);
  const [selectedScope, setSelectedScope] = useState("");
  const [scopeBusy, setScopeBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const requestGeneration = useRef(0);
  const cancelStreamRef = useRef<(() => void) | undefined>(undefined);
  const hasKeyRef = useRef(false);
  const startStructureRef = useRef<() => void>(() => {});
  const providerIdRef = useRef<ProviderId>("anthropic");
  const codingAgentRef = useRef<string | null>(null);

  const host = useMemo(
    () =>
      createLocalReviewHost({
        onPersistenceError: setPersistenceError,
        onStale: () => setStale(true),
        onGeneratePlan: () => startStructureRef.current(),
        onConnectProvider: () => {
          window.location.hash = "settings";
        },
      }),
    [],
  );

  const applyPublishedSettings = useCallback((published: PublicSettings) => {
    hasKeyRef.current = published.hasKey || Boolean(published.codingAgent);
    useReviewStore.getState().setProviderReady(hasKeyRef.current);
    providerIdRef.current = published.provider;
    codingAgentRef.current = published.codingAgent ?? null;
    if (hasKeyRef.current) {
      const agentLabel = codingAgentLabel(published.codingAgent);
      useReviewStore
        .getState()
        .setProviderLabel(agentLabel ?? getProvider(published.provider).displayName);
    }
  }, []);

  const applyMeta = useCallback((session: ReviewSessionPayload) => {
    setCommits(session.commits);
    setTotalCommits(session.totalCommits);
    setScopes(session.scopes);
    setSelectedScope(session.selectedScope);
    useReviewStore.getState().open();
    useReviewStore.getState().setPRContext(session.context);
  }, []);

  const installDiff = useCallback(
    (session: ReviewSessionPayload) => {
      host.configureSession(session);
      applyMeta(session);
      useReviewStore.getState().bootReady({
        sessionKey: session.sessionKey,
        diff: session.diff,
      });
      useReviewStore.getState().setProviderReady(hasKeyRef.current);
    },
    [applyMeta, host],
  );

  const startStructure = useCallback(() => {
    const { diff, prContext } = useReviewStore.getState();
    if (!diff?.files.length || !prContext) return;
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
      onUsage: (usage) => useReviewStore.getState().setTokenUsage(usage, generation),
      onStatus: (phase) => useReviewStore.getState().setBuildPhase(phase, generation),
      onUnit: (unit) => useReviewStore.getState().appendUnit(unit, generation),
      onDone: (plan) => {
        useReviewStore.getState().setReady(diff, plan, generation);
      },
      onError: (error) => {
        useReviewStore.getState().setError(error, generation);
      },
    });
    cancelStreamRef.current = cancel;
  }, [host]);
  startStructureRef.current = startStructure;

  useEffect(() => {
    let cancelled = false;
    const request = ++requestGeneration.current;

    async function boot() {
      const res = await fetch("/api/session");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Could not load the review (${res.status}).`);
      }
      const session = (await res.json()) as ReviewSessionPayload;
      if (cancelled || request !== requestGeneration.current) return;

      applyPublishedSettings(session.settings);

      host.configureSession(session);
      applyMeta(session);
      const restored = await restoreSession(
        session.sessionKey,
        () => !cancelled && request === requestGeneration.current,
      );
      if (cancelled || request !== requestGeneration.current) return;
      if (restored) {
        return;
      }
      installDiff(session);
    }

    void boot().catch((error: unknown) => {
      if (cancelled || request !== requestGeneration.current) return;
      const message = error instanceof Error ? error.message : "Failed to start the review.";
      setBootError(message);
      useReviewStore.getState().setError(message);
      useReviewStore.getState().open();
    });

    return () => {
      cancelled = true;
      cancelStreamRef.current?.();
    };
  }, [applyMeta, applyPublishedSettings, installDiff, host]);

  async function selectScope(scope: string) {
    if (scope === selectedScope || scopeBusy) return;
    const request = ++requestGeneration.current;
    setScopeBusy(true);
    cancelStreamRef.current?.();
    cancelStreamRef.current = undefined;
    useReviewStore.setState((state) => ({ streamGeneration: state.streamGeneration + 1 }));
    try {
      await persistSession();
      await host.flushSessions();
      const res = await fetch("/api/diff", {
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
      host.configureSession(body);
      setStale(false);
      if (await restoreSession(body.sessionKey, () => request === requestGeneration.current))
        applyMeta(body);
      else installDiff(body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not load that diff.";
      setPersistenceError(message);
    } finally {
      setScopeBusy(false);
    }
  }

  useEffect(() => {
    const flush = () => {
      void persistSession();
      host.flushOnUnload();
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [host]);

  const status = useReviewStore((s) => s.status);

  useEffect(() => {
    if (status !== "ready" || scopeBusy) return;

    let cancelled = false;
    let inFlight = false;

    async function poll() {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch("/api/diff-status");
        const body = (await res.json().catch(() => ({}))) as { changed?: boolean };
        if (!cancelled && res.ok && body.changed) setStale(true);
      } catch {
        // Next interval retries.
      } finally {
        inFlight = false;
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [status, scopeBusy]);

  const localDiff: LocalDiffControls = {
    scopes,
    selectedScope,
    commits,
    totalCommits,
    onSelectScope: (id) => {
      void selectScope(id);
    },
    scopeBusy,
    stale,
    onRefresh: () => {
      window.location.reload();
    },
  };

  const settingsOpen = route === "settings" || route === "about";

  if (bootError && !useReviewStore.getState().isOpen && !settingsOpen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
        <p>{bootError}</p>
      </div>
    );
  }

  return (
    <ReviewHostProvider host={host}>
      {persistenceError && (
        <p
          role="alert"
          data-testid="session-save-error"
          className="fixed inset-x-0 top-0 z-[2147483647] bg-background p-3 text-warning"
        >
          {persistenceError}
        </p>
      )}
      <Overlay
        allowExit={false}
        inert={settingsOpen}
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
      {(route === "settings" || route === "about") && (
        <SettingsApp
          route={route}
          onSaved={applyPublishedSettings}
          onClose={() => {
            window.location.hash = "review";
          }}
        />
      )}
    </ReviewHostProvider>
  );
}
