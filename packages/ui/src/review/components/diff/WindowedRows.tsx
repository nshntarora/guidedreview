import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@guided-review/ui";

const PAGE_SIZE = 100;

/** Keep variable-height row pages near the viewport. A full view remains
 * available for browser find, assistive technology, and cross-page selection. */
export function WindowedRows({
  count,
  renderRow,
  isPinned,
}: {
  count: number;
  renderRow(index: number): ReactNode;
  isPinned(index: number): boolean;
}) {
  const [all, setAll] = useState(false);
  if (count <= 500 || typeof IntersectionObserver === "undefined" || all) {
    return <>{Array.from({ length: count }, (_, i) => renderRow(i))}</>;
  }
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        data-testid="diff-show-all-lines"
        onClick={() => setAll(true)}
      >
        Show all lines
      </Button>
      {Array.from({ length: Math.ceil(count / PAGE_SIZE) }, (_, page) => {
        const start = page * PAGE_SIZE;
        const end = Math.min(count, start + PAGE_SIZE);
        let pinned = false;
        for (let i = start; i < end; i++)
          if (isPinned(i)) {
            pinned = true;
            break;
          }
        return (
          <RowPage
            key={page}
            count={end - start}
            pinned={pinned}
            render={() => Array.from({ length: end - start }, (_, i) => renderRow(start + i))}
          />
        );
      })}
    </>
  );
}

function RowPage({
  count,
  pinned,
  render,
}: {
  count: number;
  pinned: boolean;
  render(): ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const height = useRef(count * 23);
  const [visible, setVisible] = useState(false);
  const mounted = visible || pinned;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Don't remove code while a user is selecting it with the mouse.
        if (!entry.isIntersecting && !document.getSelection()?.isCollapsed) return;
        setVisible(entry.isIntersecting);
      },
      { root: element.closest('[data-testid="code-col"]'), rootMargin: "1000px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!mounted || !ref.current) return;
    const element = ref.current;
    const measure = () => {
      height.current = element.getBoundingClientRect().height;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [mounted]);
  return (
    <div
      ref={ref}
      data-testid="diff-row-page"
      style={mounted ? undefined : { height: height.current }}
    >
      {mounted ? render() : null}
    </div>
  );
}
