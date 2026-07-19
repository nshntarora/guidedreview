import type { ReviewUnit } from "../../../lib/types";

interface ContextPanelProps {
  unit: ReviewUnit;
}

export function ContextPanel({ unit }: ContextPanelProps) {
  return (
    <div className="gr-context-panel">
      <div className="gr-context-panel-body">{unit.context}</div>
    </div>
  );
}
