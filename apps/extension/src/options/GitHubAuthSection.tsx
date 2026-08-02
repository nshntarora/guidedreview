import { useEffect, useState } from "react";
import type { GitHubPublicAuthState } from "@extension/lib/types";
import { GitHubLogo } from "@extension/components/GitHubLogo";
import {
  GITHUB_CLIENT_ID_ENV_VAR,
  isGitHubOAuthConfigured,
} from "@extension/lib/github/oauthConfig";
import { useCopyToClipboard } from "@extension/lib/useCopyToClipboard";
import {
  openVerificationUri,
  useGitHubDeviceAuth,
} from "@extension/lib/github/useGitHubDeviceAuth";
import { clearGitHubAuthSession, getGitHubAuthStatus } from "@extension/lib/messaging";
import { confirm, ConfirmationHost } from "@extension/lib/confirmation";
import { Button, Spinner, cn } from "@guided-review/ui";
import { SettingsCard } from "./SettingsCard";

type SessionState =
  | { kind: "loading" }
  | { kind: "disconnected" }
  | { kind: "connected"; auth: GitHubPublicAuthState };

/**
 * Options section: GitHub device OAuth connect / disconnect.
 * Device poll loop lives in useGitHubDeviceAuth (shared with the overlay modal).
 */
export function GitHubAuthSection() {
  const configured = isGitHubOAuthConfigured();
  const [session, setSession] = useState<SessionState>({ kind: "loading" });
  const [disconnectBusy, setDisconnectBusy] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const { copied, copy: copyUserCode, resetCopied } = useCopyToClipboard();

  const {
    flow,
    busy: connectBusy,
    startConnect,
    cancel,
  } = useGitHubDeviceAuth({
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
    resetCopied();
  };

  const performDisconnect = async () => {
    if (disconnectBusy || connectBusy) return;
    setDisconnectBusy(true);
    setDisconnectError(null);
    try {
      await clearGitHubAuthSession();
      setSession({ kind: "disconnected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not disconnect GitHub.";
      setDisconnectError(message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setDisconnectBusy(false);
    }
  };

  const requestDisconnect = () => {
    if (disconnectBusy || connectBusy) return;
    confirm({
      title: "Disconnect GitHub?",
      body: "You won't be able to submit reviews from Guided Review until you connect again. AI provider settings are unchanged.",
      variant: "destructive",
      okButtonText: "Disconnect",
      cancelButtonText: "Cancel",
      okButtonHandler: () => performDisconnect(),
    });
  };

  const busy = connectBusy || disconnectBusy;
  const showError = flow.kind === "error" ? flow.message : disconnectError;

  return (
    <SettingsCard
      title="GitHub Account"
      titleId="github-heading"
      icon={
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary"
          aria-hidden="true"
        >
          <GitHubLogo size={18} data-testid="github-auth-logo" />
        </span>
      }
      description="Connect GitHub so you can submit reviews from Guided Review. Device sign-in — no password stored. Token stays in this browser only."
      data-testid="github-auth-section"
    >
      {!configured && (
        <p className="m-0 text-base text-muted" role="status">
          GitHub connection isn’t configured in this build. Set{" "}
          <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-sm text-foreground">
            {GITHUB_CLIENT_ID_ENV_VAR}
          </code>{" "}
          and rebuild.
        </p>
      )}

      {configured && session.kind === "loading" && flow.kind === "idle" && !showError && (
        <p className="m-0 flex items-center gap-2 text-base text-muted" role="status">
          <Spinner size={14} label="Loading GitHub connection" />
          Loading…
        </p>
      )}

      {configured && session.kind === "disconnected" && flow.kind === "idle" && !showError && (
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => {
              setDisconnectError(null);
              void startConnect();
            }}
            disabled={busy}
          >
            {busy && <Spinner size={14} label="Connecting to GitHub" />}
            {busy ? "Connecting…" : "Connect GitHub"}
          </Button>
          <span className="text-sm text-muted">Requests repo and read:user access.</span>
        </div>
      )}

      {configured && flow.kind === "awaiting" && (
        <div className="space-y-3" data-testid="github-auth-awaiting">
          <div className="flex flex-wrap items-center gap-2">
            <code
              className="rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-lg tracking-widest text-foreground"
              data-testid="github-user-code"
            >
              {flow.userCode}
            </code>
            <Button
              variant="secondary"
              onClick={() => void copyUserCode(flow.userCode)}
              data-testid="github-copy-code"
            >
              {copied ? "Copied" : "Copy Code"}
            </Button>
          </div>
          <p className="m-0 text-base text-muted" data-testid="github-copy-hint">
            Copy this code, then paste it on the GitHub tab.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-2 text-base text-muted" role="status">
              <Spinner size={14} label="Waiting for GitHub authorization" />
              Waiting for authorization…
            </span>
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={() => void openVerificationUri(flow.verificationUri)}
              data-testid="github-enter-code"
            >
              Enter Code On GitHub
            </Button>
          </div>
        </div>
      )}

      {configured && session.kind === "connected" && flow.kind === "idle" && !showError && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/60 p-3"
          data-testid="github-auth-connected"
        >
          <div className="flex min-w-0 items-center gap-3">
            {session.auth.avatarUrl ? (
              <img
                src={session.auth.avatarUrl}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full border border-border"
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-xs font-semibold text-muted"
                aria-hidden
              >
                {session.auth.login.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="m-0 truncate text-base font-semibold text-foreground">
                @{session.auth.login}
              </p>
              {session.auth.name ? (
                <p className="m-0 truncate text-sm text-muted">{session.auth.name}</p>
              ) : (
                <p className="m-0 text-sm text-success">Connected</p>
              )}
            </div>
          </div>
          <Button variant="secondary" onClick={requestDisconnect} disabled={busy}>
            {disconnectBusy && <Spinner size={14} label="Disconnecting" />}
            Disconnect
          </Button>
        </div>
      )}

      {configured && showError && (
        <div className="space-y-3" role="alert">
          <p className={cn("m-0 text-base text-danger")}>{showError}</p>
          <Button
            onClick={() => {
              setDisconnectError(null);
              void startConnect();
            }}
            disabled={busy}
          >
            Try Again
          </Button>
        </div>
      )}

      <ConfirmationHost />
    </SettingsCard>
  );
}
