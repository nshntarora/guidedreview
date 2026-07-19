import type { ReviewUnit } from "../../../lib/types";

interface ContextPanelProps {
  unit: ReviewUnit;
}

export function ContextPanel({ unit }: ContextPanelProps) {
  return (
    <div className="gr-context-panel">
      <div className="gr-context-eyebrow">Why this change</div>
      <h2 className="gr-unit-title">{unit.title}</h2>
      <div className="gr-context-panel-body">{unit.context}</div>
    </div>
  );
}
