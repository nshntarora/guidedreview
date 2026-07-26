import { Button, buttonClassName } from "@guided-review/ui";
import { openOptionsPage } from "../../../lib/messaging";

/** Docs: configure Anthropic / OpenAI / Grok and paste an API key. */
const CONFIGURE_PROVIDER_DOCS_URL = "https://guidedreview.dev/docs/configure-provider";

/** Raised panel — one step above the context-pane background. */
const SURFACE = "fill-[var(--color-gr-subtle)] stroke-[var(--color-gr-border)]";
/** Recessed area (code pane, placeholder bars) sitting inside a surface. */
const INSET = "fill-[var(--color-gr-bg)] stroke-[var(--color-gr-border)]";
/** The single accent moment: the context column waiting to be filled. */
const ACCENT_WASH =
  "fill-[color-mix(in_srgb,var(--color-gr-accent)_10%,transparent)] stroke-[var(--color-gr-accent)]";

/**
 * Review window with its AI context column empty and unconnected — same
 * vocabulary as the overlay itself (code pane on the left, context on the
 * right), drawn in the overlay's own tokens.
 */
function DisconnectedProviderArt() {
  return (
    <svg
      viewBox="0 0 240 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-auto h-20"
      aria-hidden="true"
      data-testid="connect-provider-art"
    >
      {/* Window chrome */}
      <rect x="8" y="10" width="224" height="120" rx="10" className={SURFACE} strokeWidth="1.25" />
      <circle cx="22" cy="24" r="2.5" className="fill-[var(--color-gr-border)]" />
      <circle cx="31" cy="24" r="2.5" className="fill-[var(--color-gr-border)]" />
      <circle cx="40" cy="24" r="2.5" className="fill-[var(--color-gr-border)]" />
      <line
        x1="8"
        y1="38"
        x2="232"
        y2="38"
        className="stroke-[var(--color-gr-border)]"
        strokeWidth="1.25"
      />

      {/* Code pane — the part that works without AI */}
      <rect x="20" y="50" width="112" height="68" rx="6" className={INSET} strokeWidth="1.25" />
      {[60, 72, 84, 96, 108].map((y, i) => (
        <rect
          key={y}
          x="30"
          y={y - 3}
          width={[76, 58, 84, 46, 66][i]}
          height="5"
          rx="2.5"
          className="fill-[var(--color-gr-border-muted)]"
        />
      ))}

      {/* Broken link between the review and its context */}
      <path
        d="M136 84h6"
        className="stroke-[var(--color-gr-accent)]"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M150 84h6"
        className="stroke-[var(--color-gr-accent)]"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Context column — empty, waiting for a provider */}
      <rect
        x="160"
        y="50"
        width="60"
        height="68"
        rx="6"
        className={ACCENT_WASH}
        strokeWidth="1.25"
        strokeDasharray="4 4"
      />
      <path
        d="M190 66l3.2 7.3 7.3 3.2-7.3 3.2-3.2 7.3-3.2-7.3-7.3-3.2 7.3-3.2z"
        className="fill-[var(--color-gr-accent)]"
      />
      <rect
        x="172"
        y="96"
        width="36"
        height="4"
        rx="2"
        className="fill-[var(--color-gr-accent)] opacity-40"
      />
      <rect
        x="178"
        y="106"
        width="24"
        height="4"
        rx="2"
        className="fill-[var(--color-gr-accent)] opacity-25"
      />
    </svg>
  );
}

/**
 * Shown in the context panel when no AI provider key is configured. The review
 * itself still runs on a file-per-unit plan; this explains what the AI adds and
 * sends the user to Settings.
 */
export function ConnectProviderPrompt() {
  return (
    // No live region here — the overlay's own status region already announces
    // this state, and two would double-announce it.
    <div
      className="flex flex-col items-center gap-4 px-1 py-6 text-center"
      data-testid="connect-provider-prompt"
    >
      <DisconnectedProviderArt />

      <h2 className="m-0 text-lg font-semibold text-gr-text">Connect an AI provider</h2>

      <p className="m-0 text-base leading-relaxed text-gr-muted">
        You&rsquo;re reviewing this PR file by file. Setup AI and get your review done faster.
      </p>

      <div className="flex flex-col items-center gap-2">
        <Button
          surface="overlay"
          size="sm"
          onClick={() => void openOptionsPage()}
          data-testid="connect-provider-open-settings"
        >
          Connect AI Provider
        </Button>
        <a
          href={CONFIGURE_PROVIDER_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClassName({
            variant: "ghost",
            size: "sm",
            surface: "overlay",
          })}
          data-testid="connect-provider-learn-more"
        >
          Learn more
        </a>
      </div>
    </div>
  );
}
