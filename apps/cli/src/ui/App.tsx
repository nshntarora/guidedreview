import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildFileReviewPlan, getProvider, type ProviderId } from "@guided-review/core";
import type { ReviewSessionPayload } from "../server/createServer";
import { Overlay } from "@extension/content/overlay/Overlay";
import { ReviewHostProvider } from "@extension/content/overlay/host";
import { restoreSession, useReviewStore } from "@extension/content/overlay/store";
import type { LocalDiffControls } from "@extension/content/overlay/localReview";
import { createLocalReviewHost } from "./host";
import { codingAgentLabel, structureWithLabel } from "./codingAgentLabel";
import { SettingsApp } from "./settings/SettingsApp";
import type { PublicSettings } from "./settings/Settings";

type AppRoute = "review" | "settings" | "about";

function parseAppHash(hash: string): AppRoute {
  const path = hash.replace(/^#\/?/, "").toLowerCase();
  if (path === "settings" || path === "about") return path;
  return "review";
}

function tokenFromLocation(): string {
  return new URLSearchParams(window.location.search).get("token") ?? "";
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
  const token = tokenFromLocation();
  const route = useHashRoute();
  const [bootError, setBootError] = useState<string | null>(null);
  const [commits, setCommits] = useState<ReviewSessionPayload["commits"]>([]);
  const [scopes, setScopes] = useState<ReviewSessionPayload["scopes"]>([]);
  const [selectedScope, setSelectedScope] = useState("");
  const [structured, setStructured] = useState(false);
  const [scopeBusy, setScopeBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [structureWith, setStructureWith] = useState<{
    provider: ProviderId;
    label: string;
  } | null>(null);
  const cancelStreamRef = useRef<(() => void) | undefined>(undefined);
  const hasKeyRef = useRef(false);
  const providerIdRef = useRef<ProviderId>("anthropic");
  const codingAgentRef = useRef<string | null>(null);

  const host = useMemo(
    () =>
      createLocalReviewHost({
        token,
        onConnectProvider: () => {
          window.location.hash = "settings";
        },
      }),
    [token],
  );

  const applyPublishedSettings = useCallback((published: PublicSettings) => {
    hasKeyRef.current = published.hasKey;
    providerIdRef.current = published.provider;
    codingAgentRef.current = published.codingAgent ?? null;
    setStructureWith({
      provider: published.provider,
      label: structureWithLabel(published.codingAgent, published.provider),
    });
    if (published.hasKey) {
      const agentLabel = codingAgentLabel(published.codingAgent);
      useReviewStore
        .getState()
        .setProviderLabel(agentLabel ?? getProvider(published.provider).displayName);
    }
  }, []);

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

      applyPublishedSettings(session.settings);

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
  }, [applyMeta, applyPublishedSettings, installFilePlan, token]);

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
      setStale(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not load that diff.";
      useReviewStore.getState().setError(message);
    } finally {
      setScopeBusy(false);
    }
  }

  const status = useReviewStore((s) => s.status);
  const structuring = status === "loading" || status === "streaming";

  useEffect(() => {
    if (!token || status !== "ready" || structuring || scopeBusy) return;

    let cancelled = false;
    let inFlight = false;

    async function poll() {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/diff-status?token=${encodeURIComponent(token)}`);
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
  }, [token, status, structuring, scopeBusy]);

  const localDiff: LocalDiffControls = {
    scopes,
    selectedScope,
    commits,
    onSelectScope: (id) => {
      void selectScope(id);
    },
    onStructureReview: startStructure,
    structuring,
    structured,
    scopeBusy,
    structureWith,
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
          token={token}
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
