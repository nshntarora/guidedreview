import { describe, expect, it, vi } from "vitest";
import { getFocusableElements, trapTabKey } from "./focusTrap";

describe("getFocusableElements", () => {
  it("returns visible enabled controls in order", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <button type="button">A</button>
      <button type="button" disabled>B</button>
      <a href="#x">C</a>
      <button type="button" aria-hidden="true">D</button>
      <textarea>E</textarea>
    `;
    document.body.appendChild(root);
    const found = getFocusableElements(root).map((el) => el.textContent?.trim() || el.tagName);
    // Textarea content is "E"; disabled B and aria-hidden D are excluded.
    expect(found).toEqual(["A", "C", "E"]);
    root.remove();
  });
});

describe("trapTabKey", () => {
  it("wraps forward Tab from the last control to the first", () => {
    const root = document.createElement("div");
    const a = document.createElement("button");
    a.textContent = "A";
    const b = document.createElement("button");
    b.textContent = "B";
    root.append(a, b);
    document.body.appendChild(root);
    b.focus();

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    const prevent = vi.spyOn(event, "preventDefault");
    trapTabKey(event, root);
    expect(prevent).toHaveBeenCalled();
    expect(document.activeElement).toBe(a);
    root.remove();
  });

  it("wraps Shift+Tab from the first control to the last", () => {
    const root = document.createElement("div");
    const a = document.createElement("button");
    a.textContent = "A";
    const b = document.createElement("button");
    b.textContent = "B";
    root.append(a, b);
    document.body.appendChild(root);
    a.focus();

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const prevent = vi.spyOn(event, "preventDefault");
    trapTabKey(event, root);
    expect(prevent).toHaveBeenCalled();
    expect(document.activeElement).toBe(b);
    root.remove();
  });

  it("ignores non-Tab keys", () => {
    const root = document.createElement("div");
    const a = document.createElement("button");
    root.append(a);
    document.body.appendChild(root);
    a.focus();
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    const prevent = vi.spyOn(event, "preventDefault");
    trapTabKey(event, root);
    expect(prevent).not.toHaveBeenCalled();
    root.remove();
  });
});
