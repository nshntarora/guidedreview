import { useEffect, useState } from "react";
import type { GitHubAuthState } from "../lib/types";
import { isGitHubOAuthConfigured } from "../lib/github/oauthConfig";
import {
  openVerificationUri,
  useGitHubDeviceAuth,
} from "../lib/github/useGitHubDeviceAuth";
import {
  clearGitHubAuthSession,
  getGitHubAuthStatus,
} from "../lib/messaging";
import { ActionSpinner } from "./components/ActionSpinner";
import { cn } from "../lib/cn";

type SessionState =
  | { kind: "loading" }
  | { kind: "disconnected" }
  | { kind: "connected"; auth: GitHubAuthState };

const primaryBtn =
  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-opt-accent bg-opt-accent px-4 py-2 text-[13px] font-semibold text-opt-accent-on enabled:hover:border-opt-accent-hover enabled:hover:bg-opt-accent-hover disabled:cursor-default disabled:opacity-60";

const secondaryBtn =
  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-opt-border bg-opt-subtle px-4 py-2 text-[13px] font-semibold text-opt-text disabled:cursor-default disabled:opacity-60";

/**
 * Options section: GitHub device OAuth connect / disconnect.
 * Device poll loop lives in useGitHubDeviceAuth (shared with the overlay modal).
 */
export function GitHubAuthSection() {
  const configured = isGitHubOAuthConfigured();
  const [session, setSession] = useState<SessionState>({ kind: "loading" });
  const [disconnectBusy, setDisconnectBusy] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { flow, busy: connectBusy, startConnect, cancel } = useGitHubDeviceAuth({
    enabled: configured,
    onAuthorized: (auth) => {
      setSession({ kind: "connected", auth });
    },
  });

  useEffect(() => {
    if (!configured) {
      setSession({ kind: "disconnected" });
      return;
    }

    let cancelled = false;
    void getGitHubAuthStatus()
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.auth) {
          setSession({ kind: "connected", auth: res.auth });
        } else {
          setSession({ kind: "disconnected" });
        }
      })
      .catch(() => {
        if (!cancelled) setSession({ kind: "disconnected" });
      });

    return () => {
      cancelled = true;
    };
  }, [configured]);

  const onCancel = () => {
    cancel();
    setCopied(false);
  };

  const onDisconnect = async () => {
    if (disconnectBusy || connectBusy) return;
    setDisconnectBusy(true);
    setDisconnectError(null);
    try {
      await clearGitHubAuthSession();
      setSession({ kind: "disconnected" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not disconnect GitHub.";
      setDisconnectError(message);
    } finally {
      setDisconnectBusy(false);
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

  const busy = connectBusy || disconnectBusy;
  const showError = flow.kind === "error" ? flow.message : disconnectError;

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

      {configured && session.kind === "loading" && flow.kind === "idle" && !showError && (
        <p className="flex items-center gap-2 text-[13px] text-opt-muted" role="status">
          <ActionSpinner label="Loading GitHub connection" />
          Loading…
        </p>
      )}

      {configured &&
        session.kind === "disconnected" &&
        flow.kind === "idle" &&
        !showError && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className={primaryBtn}
              onClick={() => {
                setDisconnectError(null);
                void startConnect();
              }}
              disabled={busy}
            >
              {busy && <ActionSpinner label="Connecting to GitHub" />}
              {busy ? "Connecting…" : "Connect GitHub"}
            </button>
            <span className="text-xs text-opt-muted">Requests repo and read:user access.</span>
          </div>
        )}

      {configured && flow.kind === "awaiting" && (
        <div className="space-y-3" data-testid="github-auth-awaiting">
          <div className="flex flex-wrap items-center gap-2">
            <code
              className="rounded-md border border-opt-border bg-opt-subtle px-3 py-2 font-mono text-lg tracking-widest text-opt-text"
              data-testid="github-user-code"
            >
              {flow.userCode}
            </code>
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => void onCopyCode(flow.userCode)}
              data-testid="github-copy-code"
            >
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
          <p
            className="m-0 text-[13px] text-opt-muted"
            data-testid="github-copy-hint"
          >
            Copy this code, then paste it on the GitHub tab.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-2 text-[13px] text-opt-muted" role="status">
              <ActionSpinner label="Waiting for GitHub authorization" />
              Waiting for authorization…
            </span>
            <button type="button" className={secondaryBtn} onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className={primaryBtn}
              onClick={() => void openVerificationUri(flow.verificationUri)}
              data-testid="github-enter-code"
            >
              Enter Code On Github
            </button>
          </div>
        </div>
      )}

      {configured && session.kind === "connected" && flow.kind === "idle" && !showError && (
        <div
          className="flex flex-wrap items-center justify-between gap-3"
          data-testid="github-auth-connected"
        >
          <div className="flex min-w-0 items-center gap-3">
            {session.auth.avatarUrl ? (
              <img
                src={session.auth.avatarUrl}
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
                {session.auth.login.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="m-0 truncate text-[13px] font-semibold text-opt-text">
                @{session.auth.login}
              </p>
              {session.auth.name ? (
                <p className="m-0 truncate text-xs text-opt-muted">{session.auth.name}</p>
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
            {disconnectBusy && <ActionSpinner label="Disconnecting" />}
            Disconnect
          </button>
        </div>
      )}

      {configured && showError && (
        <div className="space-y-3" role="alert">
          <p className={cn("m-0 text-[13px] text-opt-error")}>{showError}</p>
          <button
            type="button"
            className={primaryBtn}
            onClick={() => {
              setDisconnectError(null);
              void startConnect();
            }}
            disabled={busy}
          >
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
