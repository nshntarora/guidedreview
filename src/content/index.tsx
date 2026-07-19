import { createRoot } from "react-dom/client";
import { parsePRUrl, type PRIdentity } from "../lib/github/diffFetch";
import { fetchConversationDescription, scrapePRContext } from "../lib/github/prContext";
import { requestPRDiff, requestReviewPlan } from "../lib/messaging";
import { Overlay } from "./overlay/Overlay";
import { OVERLAY_CSS } from "./overlay/styles";
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
  button.textContent = "Start Guided Review";
  button.setAttribute(
    "style",
    [
      "margin-left: 8px",
      "padding: 5px 12px",
      "border-radius: 6px",
      "border: 1px solid rgba(79,70,229,0.5)",
      "background: #4F46E5",
      "color: #fff",
      "font-size: 12px",
      "font-weight: 600",
      "cursor: pointer",
    ].join(";"),
  );
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
  useReviewStore.getState().open();
  // Show a loading state immediately — everything below is async, and any of it
  // (including session restore) can fail, so the user should never be staring at a
  // blank overlay while we work.
  useReviewStore.getState().startLoading();

  try {
    const restored = await restoreSession(prUrl);
    if (restored) return;

    // Scrape PR metadata (title, author, branches, description) up front so the header
    // can render it immediately, well before the diff fetch / AI plan finish.
    const prContext = scrapePRContext(pr);
    useReviewStore.getState().setPRContext(prContext);

    // The description only exists in the DOM on GitHub's "Conversation" tab
    // (e.g. missing on "Files changed"). Fetch it from there as a fallback,
    // in parallel with the diff/plan work below rather than blocking on it.
    if (!prContext.description) {
      fetchConversationDescription(pr)
        .then(({ text, html }) => {
          if (!text) return;
          useReviewStore
            .getState()
            .setPRContext({ ...prContext, description: text, descriptionHtml: html });
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

    const response = await requestReviewPlan(diff, prContext);

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
  style.textContent = OVERLAY_CSS;
  shadowRoot.appendChild(style);

  const appRoot = document.createElement("div");
  shadowRoot.appendChild(appRoot);

  createRoot(appRoot).render(<Overlay prUrl={prUrl} />);
}
