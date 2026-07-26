import { useEffect, useId, useRef, type MutableRefObject } from "react";
import { GitHubLogo } from "../../../components/GitHubLogo";
import { GITHUB_CLIENT_ID_ENV_VAR, isGitHubOAuthConfigured } from "../../../lib/github/oauthConfig";
import { useCopyToClipboard } from "../../../lib/useCopyToClipboard";
import { openVerificationUri, useGitHubDeviceAuth } from "../../../lib/github/useGitHubDeviceAuth";
import { CloseButton } from "./CloseButton";
import { Button, Kbd, Spinner } from "@guided-review/ui";
import { ModalShell } from "./ModalShell";

export interface ConnectGitHubModalProps {
  open: boolean;
  onClose: () => void;
  /** Fired after device flow succeeds and the token is stored in the background. */
  onAuthenticated: () => void;
  /**
   * Bound to the latest primary action (Connect / Try again / open GitHub) so
   * the overlay capture keydown can fire Enter without relying on element React handlers.
   */
  connectActionRef?: MutableRefObject<(() => void) | null>;
}

/**
 * Prompt + device OAuth flow when the user tries to submit a review without a
 * stored GitHub token. On success, parent closes this and opens Submit Review.
 */
export function ConnectGitHubModal({
  open,
  onClose,
  onAuthenticated,
  connectActionRef,
}: ConnectGitHubModalProps) {
  const titleId = useId();
  const configured = isGitHubOAuthConfigured();
  const { copied, copy: copyUserCode, resetCopied } = useCopyToClipboard();
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { flow, busy, startConnect, cancel, reset } = useGitHubDeviceAuth({
    enabled: configured && open,
    onAuthorized: () => {
      onAuthenticated();
    },
  });

  // Reset flow when the modal closes so a later open starts at the prompt.
  useEffect(() => {
    if (!open) {
      reset();
      resetCopied();
    }
  }, [open, reset, resetCopied]);

  useEffect(() => {
    if (!open) return;
    if (flow.kind === "idle" && !busy) {
      connectButtonRef.current?.focus();
    }
  }, [open, flow.kind, busy]);

  const canStartConnect = configured && !busy && (flow.kind === "idle" || flow.kind === "error");
  const awaitingUri = flow.kind === "awaiting" ? flow.verificationUri : null;

  useEffect(() => {
    if (!connectActionRef) return;
    if (!open) {
      connectActionRef.current = null;
      return;
    }
    if (canStartConnect) {
      connectActionRef.current = () => {
        void startConnect();
      };
      return () => {
        connectActionRef.current = null;
      };
    }
    if (awaitingUri) {
      connectActionRef.current = () => {
        void openVerificationUri(awaitingUri);
      };
      return () => {
        connectActionRef.current = null;
      };
    }
    connectActionRef.current = null;
    return () => {
      connectActionRef.current = null;
    };
  }, [open, canStartConnect, awaitingUri, startConnect, connectActionRef]);

  if (!open) return null;

  const onCancel = () => {
    cancel();
    resetCopied();
    onClose();
  };

  return (
    <ModalShell
      scrimTestId="connect-github-scrim"
      onScrimDismiss={!busy && flow.kind !== "awaiting" ? onClose : undefined}
      maxWidthClassName="max-w-[480px]"
      panelProps={{
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "data-testid": "connect-github-modal",
        "data-flow": flow.kind,
      }}
    >
      <div className="flex items-center justify-end border-b border-border px-4 py-3">
        <CloseButton onClick={onCancel} testId="connect-github-close" />
      </div>

      <div className="flex flex-col items-center gap-4 px-6 py-6 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-muted text-primary"
          aria-hidden="true"
        >
          <GitHubLogo data-testid="connect-github-logo" />
        </div>

        <h2 id={titleId} className="m-0 w-full text-center text-lg font-semibold text-foreground">
          Connect GitHub
        </h2>

        {!configured ? (
          <p className="m-0 w-full text-center text-base leading-relaxed text-muted" role="status">
            GitHub connection isn’t configured in this build. Set{" "}
            <code className="rounded bg-surface px-1 py-0.5 text-sm text-foreground">
              {GITHUB_CLIENT_ID_ENV_VAR}
            </code>{" "}
            and rebuild.
          </p>
        ) : flow.kind === "error" ? (
          <p
            className="m-0 w-full rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-left text-base leading-snug text-red-200"
            role="alert"
            data-testid="connect-github-error"
          >
            {flow.message}
          </p>
        ) : flow.kind === "awaiting" ? (
          <div className="w-full space-y-3 text-left" data-testid="connect-github-awaiting">
            <div className="flex flex-wrap items-center justify-center gap-2 my-4">
              <code
                className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-lg tracking-widest text-foreground"
                data-testid="connect-github-user-code"
              >
                {flow.userCode}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void copyUserCode(flow.userCode)}
                data-testid="connect-github-copy-code"
              >
                {copied ? "Copied" : "Copy Code"}
              </Button>
            </div>
            <p
              className="m-0 text-center text-base leading-relaxed text-muted"
              data-testid="connect-github-copy-hint"
            >
              Copy this code, then paste it on the GitHub tab.
            </p>
            <span
              className="flex items-center justify-center gap-2 text-base text-muted"
              role="status"
            >
              <Spinner label="Waiting for GitHub authorization" size={16} />
              Waiting for authorization…
            </span>
          </div>
        ) : (
          <p
            className="m-0 w-full text-center text-base leading-relaxed text-muted"
            data-testid="connect-github-prompt"
          >
            Connect GitHub to submit this review. Uses device sign-in; the token stays in this
            browser only.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onCancel}
          data-testid="connect-github-cancel"
        >
          Cancel
          <Kbd>Esc</Kbd>
        </Button>
        {configured && flow.kind === "error" ? (
          <Button
            size="sm"
            onClick={() => void startConnect()}
            disabled={busy}
            data-testid="connect-github-retry"
          >
            {busy ? (
              <>
                <Spinner label="Connecting to GitHub" size={14} />
                Connecting…
              </>
            ) : (
              <>
                Try Again
                <Kbd>Enter</Kbd>
              </>
            )}
          </Button>
        ) : configured && flow.kind === "awaiting" ? (
          <Button
            size="sm"
            onClick={() => void openVerificationUri(flow.verificationUri)}
            data-testid="connect-github-enter-code"
          >
            Enter Code On GitHub
            <Kbd>Enter</Kbd>
          </Button>
        ) : configured ? (
          <Button
            ref={connectButtonRef}
            size="sm"
            onClick={() => void startConnect()}
            disabled={busy}
            data-testid="connect-github-connect"
          >
            {busy ? (
              <>
                <Spinner label="Connecting to GitHub" size={14} />
                Connecting…
              </>
            ) : (
              <>
                Connect GitHub
                <Kbd>Enter</Kbd>
              </>
            )}
          </Button>
        ) : null}
      </div>
    </ModalShell>
  );
}
