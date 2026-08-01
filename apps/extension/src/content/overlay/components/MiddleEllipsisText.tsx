import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@guided-review/ui";

import { middleTruncate } from "../../../lib/middleTruncate";

interface MiddleEllipsisTextProps {
  /** Full text to display; truncated in the middle when it overflows. */
  text: string;
  /**
   * CSS max-width from the parent layout. Required — width-aware middle
   * truncation only runs when the parent constrains width via CSS.
   */
  maxWidth: string | number;
  className?: string;
}

/**
 * Single-line path label that middle-truncates to fit a CSS max-width so both
 * the start and end stay visible. Full string is always available via `title`.
 *
 * Path labels only — do not use for prose review unit titles (those wrap).
 */
export function MiddleEllipsisText({ text, maxWidth, className }: MiddleEllipsisTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(text);
  const maxWidthStyle = typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      if (width <= 0) {
        setDisplay(text);
        return;
      }

      const maxChars = maxCharsForWidth(text, width, el);
      setDisplay(middleTruncate(text, maxChars));
    };

    update();

    // jsdom has no ResizeObserver; fall back to window resize only.
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, maxWidthStyle]);

  return (
    <span
      ref={ref}
      className={cn("block min-w-0 overflow-hidden whitespace-nowrap", className)}
      style={{ maxWidth: maxWidthStyle }}
      title={text}
    >
      {display}
    </span>
  );
}

/** Shared canvas for measureText; recreated only if document is unavailable. */
let measureCanvas: HTMLCanvasElement | null = null;

function getMeasureContext(el: HTMLElement): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return null;
  const style = getComputedStyle(el);
  // Match the rendered font so char widths track mono/proportional fonts.
  ctx.font = style.font || `${style.fontSize} ${style.fontFamily}`;
  return ctx;
}

/**
 * Largest character count whose rendered width fits in `width` px.
 * Binary-searches with canvas measureText; falls back to a mono estimate.
 */
function maxCharsForWidth(text: string, width: number, el: HTMLElement): number {
  if (text.length === 0) return 0;

  const ctx = getMeasureContext(el);
  if (!ctx) {
    // jsdom / no canvas: rough mono estimate (~0.6em per char is typical).
    const fontSize = parseFloat(getComputedStyle(el).fontSize) || 13;
    return Math.max(1, Math.floor(width / (fontSize * 0.6)));
  }

  if (ctx.measureText(text).width <= width) {
    return text.length;
  }

  let lo = 1;
  let hi = text.length;
  let best = 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const candidate = middleTruncate(text, mid);
    if (ctx.measureText(candidate).width <= width) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}
