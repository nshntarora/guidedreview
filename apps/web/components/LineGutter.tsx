const LINE_COUNT = 46;
const LINES = Array.from({ length: LINE_COUNT }, (_, i) => String(i + 1).padStart(2, "0"));

/**
 * Decorative editor-gutter margins that frame the whole page, echoing the
 * line-number column of the diff viewer the extension shows in review. Purely
 * ornamental (aria-hidden, no scroll syncing) — a fixed backdrop, not a real gutter.
 */
export function LineGutter() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 left-0 right-0 -z-10 hidden select-none lg:block"
    >
      <div className="absolute inset-y-0 left-0 flex w-12 flex-col justify-between overflow-hidden py-6 pl-4 font-mono text-[10px] leading-none text-border/60">
        {LINES.map((n) => (
          <span key={`l-${n}`}>{n}</span>
        ))}
      </div>
      <div className="absolute inset-y-0 right-0 flex w-12 flex-col justify-between overflow-hidden py-6 pr-4 text-right font-mono text-[10px] leading-none text-border/60">
        {LINES.map((n) => (
          <span key={`r-${n}`}>{n}</span>
        ))}
      </div>
    </div>
  );
}
