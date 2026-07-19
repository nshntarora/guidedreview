import { useEffect, useRef } from "react";
import type { ReviewPlan } from "../../../lib/types";
import { cn } from "../../../lib/cn";
import { PR_DESCRIPTION_UNIT_TITLE } from "../displayUnits";

const SKELETON_COUNT = 4;

interface SidebarProps {
  plan: ReviewPlan | null;
  currentUnitIndex: number;
  stillBuilding: boolean;
  onSelectUnit: (index: number) => void;
}

export function Sidebar({ plan, currentUnitIndex, stillBuilding, onSelectUnit }: SidebarProps) {
  const reviewUnits = plan?.units ?? [];
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Keep the active unit visible when navigating via keyboard (←/→) or footer
  // buttons — the sidebar is independently scrollable and can leave the
  // current step off-screen on long plans.
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentUnitIndex]);

  return (
    <nav
      className="mt-6 min-h-0 flex-[1_1_50%] overflow-y-auto border-t border-gr-border-muted pt-4"
      aria-label="Review units"
    >
      <div className="px-2 pb-1 pt-2.5 text-[11px] tracking-[0.04em] text-gr-muted uppercase">
        Review units
      </div>

      <button
        type="button"
        ref={currentUnitIndex === 0 ? activeItemRef : undefined}
        aria-current={currentUnitIndex === 0 ? "true" : undefined}
        className={cn(
          "mb-0.5 block w-full cursor-pointer rounded-md border-none bg-transparent p-2 text-left text-[13px] leading-snug text-gr-text hover:bg-gr-subtle",
          currentUnitIndex === 0 && "bg-gr-accent-subtle font-semibold text-gr-accent hover:bg-gr-accent-subtle"
        )}
        onClick={() => onSelectUnit(0)}
      >
        <span className="mr-1.5 text-gr-muted">1.</span>
        {PR_DESCRIPTION_UNIT_TITLE}
      </button>

      {stillBuilding &&
        Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div
            key={`skeleton-${i}`}
            className="pointer-events-none mb-0.5 flex items-center px-2 py-2.5"
            aria-hidden="true"
            data-testid="unit-skeleton"
          >
            <span
              data-skeleton-index={i}
              className="block h-3 animate-gr-skeleton rounded bg-[linear-gradient(90deg,var(--color-gr-subtle)_0%,var(--color-gr-border-muted)_50%,var(--color-gr-subtle)_100%)] bg-size-[200%_100%]"
            />
          </div>
        ))}

      {!stillBuilding &&
        reviewUnits.map((unit, planIndex) => {
          const displayIndex = planIndex + 1;
          const isActive = displayIndex === currentUnitIndex;
          return (
            <button
              key={unit.id}
              type="button"
              ref={isActive ? activeItemRef : undefined}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "mb-0.5 block w-full cursor-pointer rounded-md border-none bg-transparent p-2 text-left text-[13px] leading-snug text-gr-text hover:bg-gr-subtle",
                isActive && "bg-gr-accent-subtle font-semibold text-gr-accent hover:bg-gr-accent-subtle"
              )}
              onClick={() => onSelectUnit(displayIndex)}
            >
              <span className="mr-1.5 text-gr-muted">{displayIndex + 1}.</span>
              {unit.title}
            </button>
          );
        })}
    </nav>
  );
}
