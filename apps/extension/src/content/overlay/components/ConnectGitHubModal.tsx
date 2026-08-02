import { useEffect, useId, useRef, type MutableRefObject, type RefObject } from "react";
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
import { Button, Kbd, Spinner } from "@guided-review/ui";
import { CloseButton, ModalShell } from "./ModalShell";

export interface ConnectGitHubModalProps {
  open: boolean;
  onClose: () => void;
  /** Fired after device flow succeeds and the token is stored in the background. */
  onAuthenticated: () => void;
  /**
   * Action-ref for overlay capture keyboard (see useOverlayKeyboard module
   * comment). Latest primary action: Connect / Try again / open verification URI.
   */
  connectActionRef?: MutableRefObject<(() => void) | null>;
}

/** Device-flow states the modal body/CTA branch on (mirrors useGitHubDeviceAuth). */
type DeviceFlowView =
  | { kind: "idle" }
  | { kind: "awaiting"; userCode: string; verificationUri: string; deviceCode: string }
  | { kind: "error"; message: string };

interface ConnectGitHubBodyProps {
  configured: boolean;
  flow: DeviceFlowView;
  copied: boolean;
  onCopyCode: (code: string) => void;
}

/** Center content: unconfigured / error / awaiting code / idle prompt. */
function ConnectGitHubBody({ configured, flow, copied, onCopyCode }: ConnectGitHubBodyProps) {
  if (!configured) {
    return (
      <p className="m-0 w-full text-center text-base leading-relaxed text-muted" role="status">
        GitHub connection isn’t configured in this build. Set{" "}
        <code className="rounded bg-surface px-1 py-0.5 text-sm text-foreground">
          {GITHUB_CLIENT_ID_ENV_VAR}
        </code>{" "}
        and rebuild.
      </p>
    );
  }

  if (flow.kind === "error") {
    return (
      <p
        className="m-0 w-full rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-left text-base leading-snug text-red-200"
        role="alert"
        data-testid="connect-github-error"
      >
        {flow.message}
      </p>
    );
  }

  if (flow.kind === "awaiting") {
    return (
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
            onClick={() => void onCopyCode(flow.userCode)}
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
        <span className="flex items-center justify-center gap-2 text-base text-muted" role="status">
          <Spinner label="Waiting for GitHub authorization" size={16} />
          Waiting for authorization…
        </span>
      </div>
    );
  }

  return (
    <p
      className="m-0 w-full text-center text-base leading-relaxed text-muted"
      data-testid="connect-github-prompt"
    >
      Connect GitHub to submit this review. Uses device sign-in; the token stays in this browser
      only.
    </p>
  );
}

interface ConnectGitHubPrimaryActionProps {
  configured: boolean;
  flow: DeviceFlowView;
  busy: boolean;
  connectButtonRef: RefObject<HTMLButtonElement | null>;
  onStartConnect: () => void;
  onOpenVerificationUri: (uri: string) => void;
}

/** Footer primary CTA for the current flow state (or null when unconfigured). */
function ConnectGitHubPrimaryAction({
  configured,
  flow,
  busy,
  connectButtonRef,
  onStartConnect,
  onOpenVerificationUri,
}: ConnectGitHubPrimaryActionProps) {
  if (!configured) return null;

  if (flow.kind === "error") {
    return (
      <Button size="sm" onClick={onStartConnect} disabled={busy} data-testid="connect-github-retry">
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
    );
  }

  if (flow.kind === "awaiting") {
    return (
      <Button
        size="sm"
        onClick={() => onOpenVerificationUri(flow.verificationUri)}
        data-testid="connect-github-enter-code"
      >
        Enter Code On GitHub
        <Kbd>Enter</Kbd>
      </Button>
    );
  }

  return (
    <Button
      ref={connectButtonRef}
      size="sm"
      onClick={onStartConnect}
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
  );
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

        <ConnectGitHubBody
          configured={configured}
          flow={flow}
          copied={copied}
          onCopyCode={copyUserCode}
        />
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
        <ConnectGitHubPrimaryAction
          configured={configured}
          flow={flow}
          busy={busy}
          connectButtonRef={connectButtonRef}
          onStartConnect={() => void startConnect()}
          onOpenVerificationUri={(uri) => void openVerificationUri(uri)}
        />
      </div>
    </ModalShell>
  );
}
