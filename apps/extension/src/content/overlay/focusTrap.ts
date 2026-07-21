/**
 * Focus-trap helpers for the overlay Shadow DOM and nested dialogs.
 * Tab handling must run in the overlay's window capture listener (which
 * stopPropagations all keys); element-level listeners alone never see Tab.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected || el.hidden) return false;
  // Walk ancestors for display:none / visibility:hidden (works in jsdom).
  let node: HTMLElement | null = el;
  while (node) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    node = node.parentElement;
  }
  return true;
}

/** Focusable, visible descendants of `container` in DOM order. */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => isVisible(el) && el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * If Tab would leave `container`, preventDefault and wrap focus.
 * Safe to call for non-Tab keys (no-op).
 */
export function trapTabKey(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== "Tab") return;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const root = container.getRootNode() as Document | ShadowRoot;
  const active = root.activeElement as HTMLElement | null;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const activeOutside = !active || active === container || !container.contains(active);

  if (event.shiftKey) {
    if (active === first || activeOutside) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last || activeOutside) {
    event.preventDefault();
    first.focus();
  }
}

/** Best-effort restore target when the guided review overlay closes. */
export function restoreFocusAfterOverlay(previous: Element | null | undefined): void {
  const startBtn = document.getElementById("guided-review-start-btn");
  if (startBtn instanceof HTMLElement) {
    startBtn.focus();
    return;
  }
  if (previous instanceof HTMLElement && previous.isConnected) {
    previous.focus();
  }
}
