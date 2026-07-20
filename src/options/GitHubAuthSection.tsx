import { useCallback, useEffect, useRef, useState } from "react";
import type { GitHubAuthState } from "../lib/types";
import { isGitHubOAuthConfigured } from "../lib/github/oauthConfig";
import {
  clearGitHubAuthSession,
  getGitHubAuthStatus,
  pollGitHubDeviceAuth,
  startGitHubDeviceAuth,
} from "../lib/messaging";
import { ActionSpinner } from "./components/ActionSpinner";
import { cn } from "../lib/cn";

type ViewState =
  | { kind: "loading" }
  | { kind: "disconnected" }
  | {
      kind: "awaiting";
      userCode: string;
      verificationUri: string;
      deviceCode: string;
    }
  | { kind: "connected"; auth: GitHubAuthState }
  | { kind: "error"; message: string };

const primaryBtn =
  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-opt-accent bg-opt-accent px-4 py-2 text-[13px] font-semibold text-opt-accent-on enabled:hover:border-opt-accent-hover enabled:hover:bg-opt-accent-hover disabled:cursor-default disabled:opacity-60";

const secondaryBtn =
  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-opt-border bg-opt-subtle px-4 py-2 text-[13px] font-semibold text-opt-text disabled:cursor-default disabled:opacity-60";

/**
 * Options section: GitHub device OAuth connect / disconnect.
 * Polling is owned here so the MV3 service worker does not need a long-lived timer.
 */
export function GitHubAuthSection() {
  const configured = isGitHubOAuthConfigured();
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollGenerationRef = useRef(0);

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

  useEffect(() => {
    if (!configured) {
      setView({ kind: "disconnected" });
      return;
    }

    let cancelled = false;
    void getGitHubAuthStatus()
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.auth) {
          setView({ kind: "connected", auth: res.auth });
        } else {
          setView({ kind: "disconnected" });
        }
      })
      .catch(() => {
        if (!cancelled) setView({ kind: "disconnected" });
      });

    return () => {
      cancelled = true;
    };
  }, [configured]);

  const schedulePoll = useCallback(
    (deviceCode: string, intervalSec: number, generation: number) => {
      if (pollTimerRef.current !== null) {
        clearTimeout(pollTimerRef.current);
      }
      pollTimerRef.current = setTimeout(() => {
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
              setView({ kind: "connected", auth: result.auth });
              return;
            }

            // Failure terminal states
            stopPolling();
            setBusy(false);
            const message =
              !result.ok
                ? result.error
                : "GitHub authorization failed. Try connecting again.";
            setView({ kind: "error", message });
          } catch (error) {
            if (generation !== pollGenerationRef.current) return;
            stopPolling();
            setBusy(false);
            const message =
              error instanceof Error
                ? error.message
                : "GitHub authorization failed unexpectedly.";
            setView({ kind: "error", message });
          }
        })();
      }, Math.max(0, intervalSec) * 1000);
    },
    [stopPolling],
  );

  const onConnect = async () => {
    if (!configured || busy) return;
    stopPolling();
    setBusy(true);
    setCopied(false);
    setView({ kind: "disconnected" });

    try {
      const start = await startGitHubDeviceAuth();
      if (!start.ok) {
        setBusy(false);
        setView({ kind: "error", message: start.error });
        return;
      }

      setView({
        kind: "awaiting",
        userCode: start.userCode,
        verificationUri: start.verificationUri,
        deviceCode: start.deviceCode,
      });

      // Open the verification page for the user.
      try {
        await chrome.tabs.create({ url: start.verificationUri });
      } catch {
        // Popup blockers / missing tabs permission — user can still click the link.
      }

      const generation = pollGenerationRef.current;
      // First poll after the server-recommended interval.
      schedulePoll(start.deviceCode, start.interval, generation);
    } catch (error) {
      setBusy(false);
      const message =
        error instanceof Error ? error.message : "Could not start GitHub sign-in.";
      setView({ kind: "error", message });
    }
  };

  const onCancel = () => {
    stopPolling();
    setBusy(false);
    setCopied(false);
    setView({ kind: "disconnected" });
  };

  const onDisconnect = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearGitHubAuthSession();
      setView({ kind: "disconnected" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not disconnect GitHub.";
      setView({ kind: "error", message });
    } finally {
      setBusy(false);
    }
  };

  const onCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="mb-8 border-b border-opt-border pb-8" data-testid="github-auth-section">
      <h2 className="mb-1.5 text-[13px] font-semibold text-opt-text">GitHub account</h2>
      <p className="mb-4 text-[13px] text-opt-muted">
        Connect GitHub so Guided Review can act on your behalf (for example, submitting reviews).
        Uses device sign-in — no password is stored here. Token stays in this browser only.
      </p>

      {!configured && (
        <p className="text-[13px] text-opt-muted" role="status">
          GitHub connection isn’t configured in this build. Set{" "}
          <code className="rounded bg-opt-subtle px-1 py-0.5 text-[12px] text-opt-text">
            VITE_GITHUB_CLIENT_ID
          </code>{" "}
          and rebuild.
        </p>
      )}

      {configured && view.kind === "loading" && (
        <p className="flex items-center gap-2 text-[13px] text-opt-muted" role="status">
          <ActionSpinner label="Loading GitHub connection" />
          Loading…
        </p>
      )}

      {configured && view.kind === "disconnected" && (
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className={primaryBtn}
            onClick={() => void onConnect()}
            disabled={busy}
          >
            {busy && <ActionSpinner label="Connecting to GitHub" />}
            {busy ? "Connecting…" : "Connect GitHub"}
          </button>
          <span className="text-xs text-opt-muted">Requests repo and read:user access.</span>
        </div>
      )}

      {configured && view.kind === "awaiting" && (
        <div className="space-y-3" data-testid="github-auth-awaiting">
          <p className="m-0 text-[13px] text-opt-muted">
            Enter this code at{" "}
            <a
              href={view.verificationUri}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-opt-text underline"
            >
              {view.verificationUri.replace(/^https?:\/\//, "")}
            </a>
            , then keep this page open until authorization finishes.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              className="rounded-md border border-opt-border bg-opt-subtle px-3 py-2 font-mono text-lg tracking-widest text-opt-text"
              data-testid="github-user-code"
            >
              {view.userCode}
            </code>
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => void onCopyCode(view.userCode)}
            >
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-2 text-[13px] text-opt-muted" role="status">
              <ActionSpinner label="Waiting for GitHub authorization" />
              Waiting for authorization…
            </span>
            <button type="button" className={secondaryBtn} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {configured && view.kind === "connected" && (
        <div
          className="flex flex-wrap items-center justify-between gap-3"
          data-testid="github-auth-connected"
        >
          <div className="flex min-w-0 items-center gap-3">
            {view.auth.avatarUrl ? (
              <img
                src={view.auth.avatarUrl}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full border border-opt-border"
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border border-opt-border bg-opt-subtle text-xs font-semibold text-opt-muted"
                aria-hidden
              >
                {view.auth.login.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="m-0 truncate text-[13px] font-semibold text-opt-text">
                @{view.auth.login}
              </p>
              {view.auth.name ? (
                <p className="m-0 truncate text-xs text-opt-muted">{view.auth.name}</p>
              ) : (
                <p className="m-0 text-xs text-opt-ok">Connected</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => void onDisconnect()}
            disabled={busy}
          >
            {busy && <ActionSpinner label="Disconnecting" />}
            Disconnect
          </button>
        </div>
      )}

      {configured && view.kind === "error" && (
        <div className="space-y-3" role="alert">
          <p className={cn("m-0 text-[13px] text-opt-error")}>{view.message}</p>
          <button
            type="button"
            className={primaryBtn}
            onClick={() => void onConnect()}
            disabled={busy}
          >
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
