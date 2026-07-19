import type { ReviewPlan } from "../../../lib/types";

interface SidebarProps {
  plan: ReviewPlan;
  currentUnitIndex: number;
  onSelectUnit: (index: number) => void;
}

export function Sidebar({
  plan,
  currentUnitIndex,
  onSelectUnit,
}: SidebarProps) {
  return (
    <nav className="gr-sidebar">
      <div className="gr-sidebar-section-title">Review units</div>
      {plan.units.map((unit, index) => (
        <button
          key={unit.id}
          className={`gr-unit-item${index === currentUnitIndex ? " gr-active" : ""}`}
          onClick={() => onSelectUnit(index)}
        >
          <span className="gr-unit-item-index">{index + 1}.</span>
          {unit.title}
        </button>
      ))}
    </nav>
  );
}
