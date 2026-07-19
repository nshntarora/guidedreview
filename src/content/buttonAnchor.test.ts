import { afterEach, describe, expect, it } from "vitest";
import { ensureFallbackHost, FALLBACK_HOST_ID, findButtonAnchor } from "./buttonAnchor";

afterEach(() => {
  document.body.innerHTML = "";
  document.getElementById(FALLBACK_HOST_ID)?.remove();
});

describe("findButtonAnchor", () => {
  it("prefers classic .gh-header-actions", () => {
    document.body.innerHTML = `
      <div class="gh-header">
        <div class="gh-header-actions" id="classic-actions"></div>
        <div data-component="PH_Actions" id="modern-actions" class="d-none"></div>
      </div>
    `;
    const anchor = findButtonAnchor();
    expect(anchor?.id).toBe("classic-actions");
  });

  it("falls back to classic .gh-header-meta and .gh-header-show", () => {
    document.body.innerHTML = `<div class="gh-header-meta" id="meta"></div>`;
    expect(findButtonAnchor()?.id).toBe("meta");

    document.body.innerHTML = `<div class="gh-header-show" id="show"></div>`;
    expect(findButtonAnchor()?.id).toBe("show");
  });

  it("uses modern PH_Actions and unhides a d-none slot", () => {
    document.body.innerHTML = `
      <div data-component="PageHeader">
        <div data-component="PH_Actions" id="ph-actions" class="d-none"></div>
      </div>
    `;
    const anchor = findButtonAnchor();
    expect(anchor?.id).toBe("ph-actions");
    expect(anchor?.classList.contains("d-none")).toBe(false);
    expect(anchor?.style.display).toBe("flex");
  });

  it("uses the right-side child of PH_Navigation next to PR tabs", () => {
    document.body.innerHTML = `
      <div data-component="PH_Navigation" id="ph-nav">
        <div id="right-actions"></div>
        <div class="flex-auto">
          <nav aria-label="Pull request navigation tabs">
            <a href="/acme/widgets/pull/1">Conversation</a>
          </nav>
        </div>
      </div>
    `;
    expect(findButtonAnchor()?.id).toBe("right-actions");
  });

  it("uses PH_Navigation itself when there is no right-side child", () => {
    document.body.innerHTML = `
      <div data-component="PH_Navigation" id="ph-nav">
        <nav aria-label="Pull request navigation tabs">
          <a href="/acme/widgets/pull/1">Conversation</a>
        </nav>
      </div>
    `;
    // firstElementChild is the nav; findButtonAnchor should fall back to PH_Navigation
    expect(findButtonAnchor()?.id).toBe("ph-nav");
  });

  it("falls back to PageHeader when only that is present", () => {
    document.body.innerHTML = `<div data-component="PageHeader" id="page-header"></div>`;
    expect(findButtonAnchor()?.id).toBe("page-header");
  });

  it("returns null when no known anchors exist", () => {
    document.body.innerHTML = `<main><h1>Some PR shell</h1></main>`;
    expect(findButtonAnchor()).toBeNull();
  });
});

describe("ensureFallbackHost", () => {
  it("creates a fixed host once and reuses it", () => {
    const first = ensureFallbackHost();
    expect(first.id).toBe(FALLBACK_HOST_ID);
    expect(document.body.contains(first)).toBe(true);

    const second = ensureFallbackHost();
    expect(second).toBe(first);
    expect(document.querySelectorAll(`#${FALLBACK_HOST_ID}`)).toHaveLength(1);
  });
});
