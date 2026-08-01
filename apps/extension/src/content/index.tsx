import { createRoot } from "react-dom/client";
import { getAutoOpenOnFilesTab, onAutoOpenOnFilesTabChanged } from "../lib/autoOpenOnFilesTab";
import { parsePRUrl, type PRIdentity } from "../lib/github/diffFetch";
import { isIgnoredPrPath } from "../lib/github/ignoredPrPaths";
import { fetchConversationDescription, scrapePRContext } from "../lib/github/prContext";
import { requestPRDiff, streamReviewPlan } from "../lib/messaging";
import { getProvider } from "../lib/providers/catalog";
import { getProviderSettings, onProviderSettingsChanged } from "../lib/settings";
import type { ContentRequest, ParsedDiff, PRContext } from "../lib/types";
import { ensureFallbackHost, FALLBACK_HOST_ID, findButtonAnchor } from "./buttonAnchor";
import { Overlay } from "./overlay/Overlay";
import { isPrFilesChangedPath } from "./overlay/prConversationUrl";
import overlayStyles from "./overlay/styles/overlay.css?inline";
import { useReviewStore, restoreSession, buildSessionKey } from "./overlay/store";

const BUTTON_ID = "guided-review-start-btn";
const BUTTON_STYLE_ID = "guided-review-start-btn-styles";
const HOST_ID = "guided-review-overlay-host";
/** Brand accent — keep in sync with `--color-primary` / `--color-primary-hover` in theme.css. */
const ACCENT = "#CAFF57";
const ACCENT_HOVER = "#a8d448";

let currentPR: PRIdentity | null = null;
/** Active stream cancel handle so restart / close can abort the worker. */
let activeStreamCancel: (() => void) | null = null;
/** Whether Options → "Automatically open when I go to Files changed tab in a PR" is enabled. */
let autoOpenEnabled = false;
/**
 * Pathname of the Files/Changes tab visit we already auto-opened (or skipped
 * because the overlay was already open). Cleared when the user leaves that tab
 * so re-entry can open again; stays set after a manual close so we don't loop.
 * Matches both classic `/files` and newer `/changes` PR paths.
 */
let autoOpenedForFilesPath: string | null = null;

init();

function ensureButtonStyles(): void {
  if (document.getElementById(BUTTON_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = BUTTON_STYLE_ID;
  // Base fill/border live here (not inline) so :hover can override them —
  // style attributes beat normal stylesheet rules, including #id:hover.
  style.textContent = [
    `#${BUTTON_ID}{border:1px solid ${ACCENT};background:${ACCENT}}`,
    `#${BUTTON_ID}:hover{background:${ACCENT_HOVER};border-color:${ACCENT_HOVER}}`,
    `#${BUTTON_ID}:focus-visible{outline:2px solid ${ACCENT};outline-offset:2px}`,
    `@media (prefers-reduced-motion:reduce){#${BUTTON_ID}{transition:none}}`,
  ].join("");
  document.documentElement.appendChild(style);
}

function init(): void {
  ensureButtonStyles();
  tryInjectButton();
  void hydrateAutoOpenPreference();

  // The toolbar icon opens the action popup (`src/popup/`); when the active tab
  // is a PR page it sends START_GUIDED_REVIEW here instead of rendering.
  chrome.runtime.onMessage.addListener((message: ContentRequest) => {
    if (message?.type === "START_GUIDED_REVIEW") {
      void onStartReview();
    }
  });

  // The connect-provider prompt sends the user to the options tab; when they
  // save a key there, start the review they were already waiting on.
  onProviderSettingsChanged((settings) => {
    if (!settings.apiKey) return;
    if (!useReviewStore.getState().needsProvider) return;
    void onStartReview();
  });

  onAutoOpenOnFilesTabChanged((enabled) => {
    autoOpenEnabled = enabled;
    // Opting in while already on Files should open once (don't treat a prior
    // visit while the setting was off as "already handled").
    if (enabled) autoOpenedForFilesPath = null;
    maybeAutoOpenOnFilesTab();
  });

  // GitHub is a SPA — the PR page doesn't reload between "Conversation" /
  // "Files changed" / re-renders after data loads, so watch for DOM changes
  // and re-inject if our button gets removed (or the PR identity changes).
  // The same observer is our cheap hook for SPA tab switches (path changes
  // without a full navigation).
  const observer = new MutationObserver(() => {
    tryInjectButton();
    maybeAutoOpenOnFilesTab();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function hydrateAutoOpenPreference(): Promise<void> {
  autoOpenEnabled = await getAutoOpenOnFilesTab();
  maybeAutoOpenOnFilesTab();
}

/**
 * If the preference is on and the user just landed on Files changed
 * (`/files` or `/changes`), open (or resume) the review once for this visit.
 */
function maybeAutoOpenOnFilesTab(): void {
  const pathname = window.location.pathname;
  // Always clear when leaving Files/Changes so re-entry can open again — even
  // if the preference is currently off (so path state doesn't go stale).
  if (!isPrFilesChangedPath(pathname)) {
    autoOpenedForFilesPath = null;
    return;
  }

  if (!autoOpenEnabled) return;
  if (autoOpenedForFilesPath === pathname) return;

  if (useReviewStore.getState().isOpen) {
    autoOpenedForFilesPath = pathname;
    return;
  }

  autoOpenedForFilesPath = pathname;
  void onStartReview();
}

function removeStartButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById(FALLBACK_HOST_ID)?.remove();
  currentPR = null;
}

function tryInjectButton(): void {
  const pr = parsePRUrl(window.location.href);
  // Content script matches all github.com; tear down UI when the SPA leaves a PR,
  // or lands on a PR surface we intentionally skip (e.g. conflict resolution).
  if (!pr || isIgnoredPrPath(window.location.pathname)) {
    removeStartButton();
    return;
  }

  currentPR = pr;

  // Prefer a real header action slot; fall back to a fixed host so the button
  // still appears on beta / partially-rendered PR shells. If a better anchor
  // appears later (SPA paint), re-parent the existing button into it.
  const preferred = findButtonAnchor();
  const anchor = preferred ?? ensureFallbackHost();

  const existing = document.getElementById(BUTTON_ID);
  if (existing?.isConnected) {
    if (!anchor.contains(existing)) {
      anchor.appendChild(existing);
      removeFallbackHostIfEmpty();
    }
    return;
  }
  existing?.remove();

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  // Size matches GitHub Primer medium action buttons (32px) in the PR header.
  button.setAttribute(
    "style",
    [
      "display: inline-flex",
      "align-items: center",
      "justify-content: center",
      "box-sizing: border-box",
      "height: 32px",
      "gap: 8px",
      "margin-left: 8px",
      "padding: 0 12px",
      "border-radius: 6px",
      // border + background come from ensureButtonStyles() so :hover can apply
      "color: #0D0806",
      "font-size: 14px",
      "font-weight: 600",
      "cursor: pointer",
      "line-height: 20px",
      "transition: background 0.12s ease, border-color 0.12s ease",
    ].join(";"),
  );

  // Tint the lime logomark to brand black so it reads on the primary background.
  const markUrl = chrome.runtime.getURL("logomark.svg");
  const mark = document.createElement("span");
  mark.setAttribute("aria-hidden", "true");
  mark.setAttribute(
    "style",
    [
      "display: block",
      "width: 22px",
      "height: 11px",
      "flex-shrink: 0",
      "background-color: #0D0806",
      `-webkit-mask: url("${markUrl}") center / contain no-repeat`,
      `mask: url("${markUrl}") center / contain no-repeat`,
    ].join(";"),
  );

  const label = document.createElement("span");
  label.textContent = "Start Guided Review";

  button.append(mark, label);
  button.addEventListener("click", onStartReview);

  anchor.appendChild(button);
  removeFallbackHostIfEmpty();
}

function removeFallbackHostIfEmpty(): void {
  const host = document.getElementById(FALLBACK_HOST_ID);
  if (host && host.childElementCount === 0) {
    host.remove();
  }
}

function cancelActiveStream(): void {
  if (activeStreamCancel) {
    activeStreamCancel();
    activeStreamCancel = null;
  }
}

function startAnnotationStream(
  diff: ParsedDiff,
  prContext: PRContext,
  streamGeneration: number,
): void {
  // Request is on the wire — show "Sent it to …" until the worker reports waiting/tokens.
  useReviewStore.getState().setBuildPhase("sent_to_provider", streamGeneration);

  const { cancel } = streamReviewPlan(diff, prContext, {
    onStatus: (phase) => useReviewStore.getState().setBuildPhase(phase, streamGeneration),
    onUnit: (unit) => useReviewStore.getState().appendUnit(unit, streamGeneration),
    onDone: (plan) => {
      activeStreamCancel = null;
      useReviewStore.getState().setReady(diff, plan, streamGeneration);
    },
    onError: (error) => {
      activeStreamCancel = null;
      useReviewStore.getState().setError(error, streamGeneration);
    },
  });
  activeStreamCancel = cancel;
}

/**
 * Retry after a failure. If the diff was already fetched, re-run only the LLM
 * annotate call; otherwise restart the full review flow (diff fetch + annotate).
 */
function retryAnnotation(): void {
  const { diff, prContext } = useReviewStore.getState();
  if (diff && prContext) {
    cancelActiveStream();
    const generation = useReviewStore.getState().beginRetry();
    startAnnotationStream(diff, prContext, generation);
    return;
  }
  void onStartReview();
}

async function onStartReview(): Promise<void> {
  // Prefer the cached identity from button injection; re-parse the URL so a
  // toolbar-icon click still works if the button hasn't painted yet.
  if (isIgnoredPrPath(window.location.pathname)) return;
  const pr = currentPR ?? parsePRUrl(window.location.href);
  if (!pr) return;
  currentPR = pr;
  const sessionKey = buildSessionKey(pr);

  ensureOverlayMounted();
  cancelActiveStream();

  // Scrape PR metadata first so the overlay can render the full layout with the
  // PR description unit immediately — before the diff fetch / AI plan finish.
  const prContext = scrapePRContext(pr);
  useReviewStore.getState().open();
  useReviewStore.getState().setPRContext(prContext);
  useReviewStore.getState().startLoading(sessionKey);
  const streamGeneration = useReviewStore.getState().streamGeneration;

  try {
    const restored = await restoreSession(sessionKey);
    if (restored) return;

    // The description only exists in the DOM on GitHub's "Conversation" tab
    // (e.g. missing on "Files changed"). Fetch it from there as a fallback,
    // in parallel with the diff/plan work below rather than blocking on it.
    if (!prContext.description) {
      fetchConversationDescription(pr)
        .then(({ text, html }) => {
          if (!text) return;
          const current = useReviewStore.getState().prContext ?? prContext;
          useReviewStore
            .getState()
            .setPRContext({ ...current, description: text, descriptionHtml: html });
        })
        .catch(() => {
          // best-effort only — the review doesn't depend on the description
        });
    }

    // Neither depends on the other, and the provider check only matters once
    // the diff has landed — so pay for one round-trip, not two.
    const [diffResponse, settings] = await Promise.all([requestPRDiff(pr), getProviderSettings()]);
    if (!diffResponse.ok) {
      useReviewStore.getState().setError(diffResponse.error, streamGeneration);
      return;
    }
    const diff = diffResponse.diff;

    // Store the diff early so header stats and unit resolution work while the
    // plan is still streaming in.
    useReviewStore.getState().setDiff(diff);

    // Without a provider there's no plan to stream: fall back to one unit per
    // changed file so the diff, comments and submit flow all still work.
    if (!settings.apiKey) {
      useReviewStore.getState().setNeedsProvider();
      return;
    }

    useReviewStore.getState().setProviderLabel(getProvider(settings.provider).displayName);
    useReviewStore.getState().beginStreaming(streamGeneration);

    const latestContext = useReviewStore.getState().prContext ?? prContext;
    startAnnotationStream(diff, latestContext, streamGeneration);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build the review.";
    useReviewStore.getState().setError(message, streamGeneration);
  }
}

let overlayMounted = false;

function ensureOverlayMounted(): void {
  if (overlayMounted) return;
  overlayMounted = true;

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = overlayStyles;
  shadowRoot.appendChild(style);

  const appRoot = document.createElement("div");
  shadowRoot.appendChild(appRoot);

  // Overlay reads the active session key from the store, so SPA navigation to
  // another PR never leaves a stale prUrl prop from the first mount.
  createRoot(appRoot).render(
    <Overlay onRequestClose={cancelActiveStream} onRetry={retryAnnotation} />,
  );
}
