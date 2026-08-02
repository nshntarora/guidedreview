import { useEffect, useRef } from "react";
import type { ReviewPlan } from "@extension/lib/types";
import { cn } from "@guided-review/ui";
import { buildDisplayUnits } from "@extension/content/overlay/store";
import { TestsUnitIcon } from "./TestsUnitIcon";

const SKELETON_COUNT = 4;

interface SidebarProps {
  plan: ReviewPlan | null;
  currentUnitIndex: number;
  /** When true, show trailing skeleton rows after any completed units. */
  stillBuilding: boolean;
  onSelectUnit: (index: number) => void;
}

export function Sidebar({ plan, currentUnitIndex, stillBuilding, onSelectUnit }: SidebarProps) {
  const displayUnits = buildDisplayUnits(plan);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Keep the active unit visible when navigating via keyboard (←/→) or footer
  // buttons — the sidebar is independently scrollable and can leave the
  // current step off-screen on long plans.
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [currentUnitIndex]);

  return (
    <nav
      className="mt-6 min-h-0 flex-[1_1_50%] overflow-y-auto border-t border-border-strong pt-4"
      aria-label="Review Units"
    >
      <div className="px-5">
        <div className="px-2 pb-1 pt-2.5 text-xs tracking-[0.04em] text-muted uppercase">
          Review Units
        </div>

        {displayUnits.map((unit, displayIndex) => {
          const isActive = displayIndex === currentUnitIndex;
          const isTestsUnit = unit.kind === "review" && unit.unit.kind === "tests";
          // displayTitle is pre-truncated in buildFileReviewPlan for path labels;
          // AI units omit it and show title. Render as plain text either way.
          const label =
            unit.kind === "review" ? (unit.unit.displayTitle ?? unit.unit.title) : unit.title;
          const tooltip = unit.kind === "review" ? unit.unit.title : unit.title;
          return (
            <button
              key={unit.id}
              type="button"
              ref={isActive ? activeItemRef : undefined}
              aria-current={isActive ? "true" : undefined}
              title={tooltip}
              className={cn(
                "mb-0.5 flex w-full cursor-pointer items-start rounded-md border-none bg-transparent p-2 text-left text-base leading-snug text-foreground",
                "hover:bg-primary-muted",
                isActive && "bg-primary-muted text-primary!",
              )}
              onClick={() => onSelectUnit(displayIndex)}
            >
              <span className={cn("mr-1.5 shrink-0", isActive ? "text-primary" : "text-muted")}>
                {displayIndex + 1}.
              </span>
              <span className="min-w-0 break-words">
                {isTestsUnit && (
                  <TestsUnitIcon
                    className={cn(
                      "mr-1.5 inline-block align-[-0.125em]",
                      isActive ? "text-primary" : "text-muted",
                    )}
                  />
                )}
                {label}
              </span>
            </button>
          );
        })}

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
                className="block h-3 animate-gr-skeleton rounded bg-[linear-gradient(90deg,var(--color-surface-muted)_0%,var(--color-border-strong)_50%,var(--color-surface-muted)_100%)] bg-size-[200%_100%]"
              />
            </div>
          ))}
      </div>
    </nav>
  );
}
