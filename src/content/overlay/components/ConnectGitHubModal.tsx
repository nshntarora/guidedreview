import {
  useEffect,
  useId,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { isGitHubOAuthConfigured } from "../../../lib/github/oauthConfig";
import {
  openVerificationUri,
  useGitHubDeviceAuth,
} from "../../../lib/github/useGitHubDeviceAuth";
import { Kbd } from "./Kbd";
import { Spinner } from "./Spinner";

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

const primaryBtn =
  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-gr-accent bg-gr-accent px-3 py-1.5 text-base font-medium text-gr-accent-on hover:border-gr-accent-hover hover:bg-gr-accent-hover disabled:cursor-not-allowed disabled:opacity-60 [&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit";

const secondaryBtn =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gr-border bg-gr-bg px-3 py-1.5 text-base text-gr-muted hover:bg-gr-subtle hover:text-gr-text disabled:cursor-not-allowed disabled:opacity-50";

/** Official GitHub mark (Octocat) — filled via currentColor. */
function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="40"
      height="40"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-testid="connect-github-logo"
    >
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
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
  const [copied, setCopied] = useState(false);
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
      setCopied(false);
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    if (flow.kind === "idle" && !busy) {
      connectButtonRef.current?.focus();
    }
  }, [open, flow.kind, busy]);

  const canStartConnect =
    configured && !busy && (flow.kind === "idle" || flow.kind === "error");
  const awaitingUri =
    flow.kind === "awaiting" ? flow.verificationUri : null;

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
    setCopied(false);
    onClose();
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
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      data-testid="connect-github-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && flow.kind !== "awaiting") {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="connect-github-modal"
        data-flow={flow.kind}
        className="flex w-full max-w-[480px] flex-col rounded-lg border border-gr-border bg-gr-chrome shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end border-b border-gr-border px-4 py-3">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-md border border-gr-border bg-gr-bg p-1.5 text-gr-muted hover:bg-gr-subtle hover:text-gr-text"
            onClick={onCancel}
            aria-label="Close"
            data-testid="connect-github-close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-6 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gr-accent-subtle text-gr-accent"
            aria-hidden="true"
          >
            <GitHubLogo />
          </div>

          <h2
            id={titleId}
            className="m-0 w-full text-center text-lg font-semibold text-gr-text"
          >
            Connect GitHub
          </h2>

          {!configured ? (
            <p
              className="m-0 w-full text-center text-base leading-relaxed text-gr-muted"
              role="status"
            >
              GitHub connection isn’t configured in this build. Set{" "}
              <code className="rounded bg-gr-bg px-1 py-0.5 text-sm text-gr-text">
                VITE_GITHUB_CLIENT_ID
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
            <div
              className="w-full space-y-3 text-left"
              data-testid="connect-github-awaiting"
            >
              <div className="flex flex-wrap items-center justify-center gap-2 my-4">
                <code
                  className="rounded-md border border-gr-border bg-gr-bg px-3 py-2 font-mono text-lg tracking-widest text-gr-text"
                  data-testid="connect-github-user-code"
                >
                  {flow.userCode}
                </code>
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={() => void onCopyCode(flow.userCode)}
                  data-testid="connect-github-copy-code"
                >
                  {copied ? "Copied" : "Copy Code"}
                </button>
              </div>
              <p
                className="m-0 text-center text-base leading-relaxed text-gr-muted"
                data-testid="connect-github-copy-hint"
              >
                Copy this code, then paste it on the GitHub tab.
              </p>
              <span
                className="flex items-center justify-center gap-2 text-base text-gr-muted"
                role="status"
              >
                <Spinner label="Waiting for GitHub authorization" size={16} />
                Waiting for authorization…
              </span>
            </div>
          ) : (
            <p
              className="m-0 w-full text-center text-base leading-relaxed text-gr-muted"
              data-testid="connect-github-prompt"
            >
              Connect GitHub to submit this review. Uses device sign-in; the token
              stays in this browser only.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gr-border px-4 py-3">
          <button
            type="button"
            className={secondaryBtn}
            onClick={onCancel}
            data-testid="connect-github-cancel"
          >
            Cancel
            <Kbd>Esc</Kbd>
          </button>
          {configured && flow.kind === "error" ? (
            <button
              type="button"
              className={primaryBtn}
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
            </button>
          ) : configured && flow.kind === "awaiting" ? (
            <button
              type="button"
              className={primaryBtn}
              onClick={() => void openVerificationUri(flow.verificationUri)}
              data-testid="connect-github-enter-code"
            >
              Enter Code On GitHub
              <Kbd>Enter</Kbd>
            </button>
          ) : configured ? (
            <button
              ref={connectButtonRef}
              type="button"
              className={primaryBtn}
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
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
