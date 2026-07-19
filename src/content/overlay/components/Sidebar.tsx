import type { ReviewPlan } from "../../../lib/types";
import { PR_DESCRIPTION_UNIT_TITLE } from "../displayUnits";

const SKELETON_COUNT = 4;

interface SidebarProps {
  plan: ReviewPlan | null;
  currentUnitIndex: number;
  loading: boolean;
  onSelectUnit: (index: number) => void;
}

export function Sidebar({ plan, currentUnitIndex, loading, onSelectUnit }: SidebarProps) {
  const reviewUnits = plan?.units ?? [];

  return (
    <nav className="gr-sidebar" aria-label="Review units">
      <div className="gr-sidebar-section-title">Review units</div>

      <button
        type="button"
        className={`gr-unit-item${currentUnitIndex === 0 ? " gr-active" : ""}`}
        onClick={() => onSelectUnit(0)}
      >
        <span className="gr-unit-item-index">1.</span>
        {PR_DESCRIPTION_UNIT_TITLE}
      </button>

      {loading &&
        Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div
            key={`skeleton-${i}`}
            className="gr-unit-item-skeleton"
            aria-hidden="true"
          >
            <span className="gr-unit-item-skeleton-bar" />
          </div>
        ))}

      {!loading &&
        reviewUnits.map((unit, planIndex) => {
          const displayIndex = planIndex + 1;
          return (
            <button
              key={unit.id}
              type="button"
              className={`gr-unit-item${displayIndex === currentUnitIndex ? " gr-active" : ""}`}
              onClick={() => onSelectUnit(displayIndex)}
            >
              <span className="gr-unit-item-index">{displayIndex + 1}.</span>
              {unit.title}
            </button>
          );
        })}
    </nav>
  );
}
