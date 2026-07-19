/**
 * GitHub PR header markup differs across the classic Files changed page and the
 * modern React PR layout (Conversation / Commits / Checks, and the improved
 * Files changed experience). Prefer stable attributes over hashed CSS-module
 * class names so anchors survive GitHub deploys.
 */

const CLASSIC_ANCHORS = [
  ".gh-header-actions",
  ".gh-header-meta",
  '[data-testid="issue-viewer-header-actions"]',
  ".gh-header-show",
] as const;

export const FALLBACK_HOST_ID = "guided-review-start-btn-host";

/**
 * Find a DOM node to append the "Start Guided Review" button into.
 * Returns null when no known header slot is present yet (caller may create a
 * fallback host, and the mutation observer will retry as the SPA renders).
 */
export function findButtonAnchor(root: ParentNode = document): HTMLElement | null {
  for (const selector of CLASSIC_ANCHORS) {
    const el = root.querySelector<HTMLElement>(selector);
    if (el) return el;
  }

  const phActions = root.querySelector<HTMLElement>('[data-component="PH_Actions"]');
  if (phActions) {
    // GitHub leaves this slot empty + d-none when there are no native actions.
    phActions.classList.remove("d-none");
    if (!phActions.style.display || phActions.style.display === "none") {
      phActions.style.display = "flex";
    }
    if (!phActions.style.alignItems) {
      phActions.style.alignItems = "center";
    }
    if (!phActions.style.gap) {
      phActions.style.gap = "8px";
    }
    return phActions;
  }

  const tabNav =
    root.querySelector<HTMLElement>('nav[aria-label="Pull request navigation tabs"]') ??
    root.querySelector<HTMLElement>('nav[aria-label="Pull request"]');
  const phNav =
    tabNav?.closest<HTMLElement>('[data-component="PH_Navigation"]') ??
    root.querySelector<HTMLElement>('[data-component="PH_Navigation"]');
  if (phNav) {
    // Prefer the right-side actions cluster (first child next to the tab list).
    const right = phNav.firstElementChild;
    if (right instanceof HTMLElement && right !== tabNav && !tabNav?.contains(right)) {
      return right;
    }
    return phNav;
  }

  // Sticky / non-sticky PageHeader as a soft modern fallback.
  const pageHeader = root.querySelector<HTMLElement>('[data-component="PageHeader"]');
  if (pageHeader) return pageHeader;

  return null;
}

/**
 * Last-resort mount point when no GitHub header slot exists (e.g. beta Files UI
 * that has not yet painted a known header). Creates a fixed host once.
 */
export function ensureFallbackHost(doc: Document = document): HTMLElement {
  const existing = doc.getElementById(FALLBACK_HOST_ID);
  if (existing instanceof HTMLElement) return existing;

  const host = doc.createElement("div");
  host.id = FALLBACK_HOST_ID;
  host.setAttribute(
    "style",
    [
      "position: fixed",
      "top: 72px",
      "right: 16px",
      "z-index: 1000",
      "display: flex",
      "align-items: center",
      "gap: 8px",
    ].join(";"),
  );
  doc.body.appendChild(host);
  return host;
}
