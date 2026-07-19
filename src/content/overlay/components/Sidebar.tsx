import { useEffect, useRef } from "react";
import type { ReviewPlan } from "../../../lib/types";
import { PR_DESCRIPTION_UNIT_TITLE } from "../displayUnits";

const SKELETON_COUNT = 4;

interface SidebarProps {
  plan: ReviewPlan | null;
  currentUnitIndex: number;
  /** When true, show trailing skeleton rows after any completed units. */
  stillBuilding: boolean;
  onSelectUnit: (index: number) => void;
}

export function Sidebar({
  plan,
  currentUnitIndex,
  stillBuilding,
  onSelectUnit,
}: SidebarProps) {
  const reviewUnits = plan?.units ?? [];
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
    <nav className="gr-sidebar" aria-label="Review units">
      <div className="gr-sidebar-section-title">Review units</div>

      <button
        type="button"
        ref={currentUnitIndex === 0 ? activeItemRef : undefined}
        className={`gr-unit-item${currentUnitIndex === 0 ? " gr-active" : ""}`}
        onClick={() => onSelectUnit(0)}
      >
        <span className="gr-unit-item-index">1.</span>
        {PR_DESCRIPTION_UNIT_TITLE}
      </button>

      {reviewUnits.map((unit, planIndex) => {
        const displayIndex = planIndex + 1;
        const isActive = displayIndex === currentUnitIndex;
        return (
          <button
            key={unit.id}
            type="button"
            ref={isActive ? activeItemRef : undefined}
            className={`gr-unit-item${isActive ? " gr-active" : ""}`}
            onClick={() => onSelectUnit(displayIndex)}
          >
            <span className="gr-unit-item-index">{displayIndex + 1}.</span>
            {unit.title}
          </button>
        );
      })}

      {stillBuilding &&
        Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div
            key={`skeleton-${i}`}
            className="gr-unit-item-skeleton"
            aria-hidden="true"
          >
            <span className="gr-unit-item-skeleton-bar" />
          </div>
        ))}
    </nav>
  );
}
