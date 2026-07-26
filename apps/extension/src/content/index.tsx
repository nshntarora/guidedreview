import { createRoot } from "react-dom/client";
import { parsePRUrl, type PRIdentity } from "../lib/github/diffFetch";
import { fetchConversationDescription, scrapePRContext } from "../lib/github/prContext";
import { requestPRDiff, streamReviewPlan } from "../lib/messaging";
import { getProviderSettings, onProviderSettingsChanged } from "../lib/settings";
import type { ContentRequest, ParsedDiff, PRContext } from "../lib/types";
import { ensureFallbackHost, FALLBACK_HOST_ID, findButtonAnchor } from "./buttonAnchor";
import { Overlay } from "./overlay/Overlay";
import overlayStyles from "./overlay/styles/overlay.css?inline";
import { useReviewStore, restoreSession, buildSessionKey } from "./overlay/store";

const BUTTON_ID = "guided-review-start-btn";
const BUTTON_STYLE_ID = "guided-review-start-btn-styles";
const HOST_ID = "guided-review-overlay-host";
/** Brand accent hover — keep in sync with `--color-gr-accent-hover` in theme.css. */
const ACCENT_HOVER = "#b6e64e";

let currentPR: PRIdentity | null = null;
/** Active stream cancel handle so restart / close can abort the worker. */
let activeStreamCancel: (() => void) | null = null;

init();

function ensureButtonStyles(): void {
  if (document.getElementById(BUTTON_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = BUTTON_STYLE_ID;
  style.textContent = [
    `#${BUTTON_ID}:hover{background:${ACCENT_HOVER};border-color:${ACCENT_HOVER}}`,
    `#${BUTTON_ID}:focus-visible{outline:2px solid #CAFF57;outline-offset:2px}`,
    `@media (prefers-reduced-motion:reduce){#${BUTTON_ID}{transition:none}}`,
  ].join("");
  document.documentElement.appendChild(style);
}

function init(): void {
  ensureButtonStyles();
  tryInjectButton();

  // Toolbar icon click is handled in the background worker; when the active
  // tab is a PR page it forwards START_GUIDED_REVIEW here.
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

  // GitHub is a SPA — the PR page doesn't reload between "Conversation" /
  // "Files changed" / re-renders after data loads, so watch for DOM changes
  // and re-inject if our button gets removed (or the PR identity changes).
  const observer = new MutationObserver(() => tryInjectButton());
  observer.observe(document.body, { childList: true, subtree: true });
}

function removeStartButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById(FALLBACK_HOST_ID)?.remove();
  currentPR = null;
}

function tryInjectButton(): void {
  const pr = parsePRUrl(window.location.href);
  // Content script matches all github.com; tear down UI when the SPA leaves a PR.
  if (!pr) {
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
      "border: 1px solid #CAFF57",
      "background: #CAFF57",
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
  const { cancel } = streamReviewPlan(diff, prContext, {
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
    // Checked before the restore so a resumed session still knows whether the
    // AI features are available.
    const hasProvider = Boolean((await getProviderSettings()).apiKey);

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

    const diffResponse = await requestPRDiff(pr);
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
    if (!hasProvider) {
      useReviewStore.getState().setNeedsProvider();
      return;
    }

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
