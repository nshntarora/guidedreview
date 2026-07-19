import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewPlan } from "../../../lib/types";
import { Sidebar } from "./Sidebar";

function planWithUnits(count: number): ReviewPlan {
  return {
    units: Array.from({ length: count }, (_, i) => ({
      id: `u${i + 1}`,
      title: `Unit ${i + 1}`,
      context: `Context for unit ${i + 1}`,
      files: [],
    })),
  };
}

describe("Sidebar", () => {
  beforeEach(() => {
    // jsdom doesn't implement layout/scroll; stub scrollIntoView so we can
    // assert the active unit is kept in view on navigation.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("scrolls the active unit into view when currentUnitIndex changes", () => {
    const plan = planWithUnits(3);
    const { rerender } = render(
      <Sidebar plan={plan} currentUnitIndex={0} loading={false} onSelectUnit={() => {}} />
    );

    // Initial mount scrolls the description unit into view.
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    const firstCallCount = (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock
      .calls.length;

    rerender(
      <Sidebar plan={plan} currentUnitIndex={2} loading={false} onSelectUnit={() => {}} />
    );

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(firstCallCount + 1);
    const lastCall = (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls.at(
      -1
    );
    expect(lastCall?.[0]).toEqual({ block: "nearest", behavior: "smooth" });

    // The active item after the jump is unit 2 (display index 2 → "3. Unit 2").
    const active = document.querySelector(".gr-unit-item.gr-active");
    expect(active).not.toBeNull();
    expect(active?.textContent).toMatch(/Unit 2/);
  });

  it("marks the PR description unit active at index 0", () => {
    render(
      <Sidebar
        plan={planWithUnits(1)}
        currentUnitIndex={0}
        loading={false}
        onSelectUnit={() => {}}
      />
    );
    const active = document.querySelector(".gr-unit-item.gr-active");
    expect(active?.textContent).toMatch(/PR description/i);
    expect(screen.getByRole("navigation", { name: /review units/i })).toBeInTheDocument();
  });
});
