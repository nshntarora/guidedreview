import type { ReviewUnit } from "../../../lib/types";

interface ContextPanelProps {
  unit: ReviewUnit;
}

export function ContextPanel({ unit }: ContextPanelProps) {
  return (
    <>
      <h2 className="gr-unit-title">{unit.title}</h2>
      <div className="gr-context-panel">{unit.context}</div>
    </>
  );
}
