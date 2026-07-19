import { createRoot } from "react-dom/client";
import { parsePRUrl, type PRIdentity } from "../lib/github/diffFetch";
import { fetchConversationDescription, scrapePRContext } from "../lib/github/prContext";
import { requestPRDiff, requestReviewPlan } from "../lib/messaging";
import { Overlay } from "./overlay/Overlay";
import overlayStyles from "./overlay/styles/overlay.css?inline";
import { useReviewStore, restoreSession } from "./overlay/store";

const BUTTON_ID = "guided-review-start-btn";
const HOST_ID = "guided-review-overlay-host";

let currentPR: PRIdentity | null = null;

init();

function init(): void {
  tryInjectButton();

  // GitHub is a SPA — the PR page doesn't reload between "Conversation" /
  // "Files changed" / re-renders after data loads, so watch for DOM changes
  // and re-inject if our button gets removed (or the PR identity changes).
  const observer = new MutationObserver(() => tryInjectButton());
  observer.observe(document.body, { childList: true, subtree: true });
}

function tryInjectButton(): void {
  const pr = parsePRUrl(window.location.href);
  if (!pr) return;

  currentPR = pr;

  if (document.getElementById(BUTTON_ID)) return;

  const anchor = findButtonAnchor();
  if (!anchor) return;

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.setAttribute(
    "style",
    [
      "display: inline-flex",
      "align-items: center",
      "gap: 8px",
      "margin-left: 8px",
      "padding: 5px 12px",
      "border-radius: 6px",
      "border: 1px solid #CAFF57",
      "background: #CAFF57",
      "color: #0D0806",
      "font-size: 12px",
      "font-weight: 600",
      "cursor: pointer",
      "line-height: 1.2",
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
}

/**
 * GitHub's PR header markup shifts across redesigns; try a few reasonably
 * stable anchors near the PR title / action bar before giving up for this
 * pass (the mutation observer will retry on the next DOM change).
 */
function findButtonAnchor(): HTMLElement | null {
  const candidates = [
    ".gh-header-actions",
    ".gh-header-meta",
    '[data-testid="issue-viewer-header-actions"]',
    ".gh-header-show",
  ];
  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}

async function onStartReview(): Promise<void> {
  if (!currentPR) return;
  const pr = currentPR;
  const prUrl = window.location.href;

  ensureOverlayMounted(prUrl);

  // Scrape PR metadata first so the overlay can render the full layout with the
  // PR description unit immediately — before the diff fetch / AI plan finish.
  const prContext = scrapePRContext(pr);
  useReviewStore.getState().open();
  useReviewStore.getState().setPRContext(prContext);
  useReviewStore.getState().startLoading();

  try {
    const restored = await restoreSession(prUrl);
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
      useReviewStore.getState().setError(diffResponse.error);
      return;
    }
    const diff = diffResponse.diff;
    // Diff summary (additions/deletions/file list) does not need the LLM —
    // surface it immediately so the description unit can show Changes while
    // the plan is still being built.
    useReviewStore.getState().setDiff(diff);

    // Prefer the latest prContext (async description fetch may have filled it in).
    const latestContext = useReviewStore.getState().prContext ?? prContext;
    const response = await requestReviewPlan(diff, latestContext);

    if (!response.ok) {
      useReviewStore.getState().setError(response.error);
      return;
    }

    useReviewStore.getState().setReady(diff, response.plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build the guided review.";
    useReviewStore.getState().setError(message);
  }
}

let overlayMounted = false;

function ensureOverlayMounted(prUrl: string): void {
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

  createRoot(appRoot).render(<Overlay prUrl={prUrl} />);
}
