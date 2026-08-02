"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@guided-review/ui";

type WindowFrameRenderState = {
  /** True while the frame is maximized to the viewport (desktop only). */
  expanded: boolean;
};

type WindowFrameProps = {
  /** Tab label rendered in the title bar, e.g. "why.md". */
  label: ReactNode;
  children: ReactNode | ((state: WindowFrameRenderState) => ReactNode);
  className?: string;
  bodyClassName?: string | ((state: WindowFrameRenderState) => string | undefined);
};

/** Desktop (not tablet/mobile) — matches Tailwind `lg` (1024px). */
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

/**
 * Editor-window chrome (traffic-light dots + monospace filename tab) used to
 * frame content blocks, echoing ProductVideo's player frame so the whole page
 * reads as one continuous "editor" rather than isolated card styles per section.
 *
 * Traffic lights mirror macOS: icons appear on group hover. Close and minimize
 * are not available (card shakes). Maximize expands on desktop only; otherwise
 * it shakes. While expanded, any traffic light restores the card.
 */
export function WindowFrame({ label, children, className, bodyClassName }: WindowFrameProps) {
  const labelId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const collapse = useCallback(() => {
    setExpanded(false);
  }, []);

  /** Brief horizontal shake — “this control isn’t available.” */
  const deny = useCallback(() => {
    setShaking(false);
    requestAnimationFrame(() => setShaking(true));
  }, []);

  const toggleMaximize = useCallback(() => {
    if (expanded) {
      collapse();
      return;
    }
    if (!isDesktop) {
      deny();
      return;
    }
    if (frameRef.current) {
      setPlaceholderHeight(frameRef.current.getBoundingClientRect().height);
    }
    setExpanded(true);
  }, [collapse, deny, expanded, isDesktop]);

  // Collapse if the viewport drops below desktop while expanded.
  useEffect(() => {
    if (!expanded) return;
    if (!isDesktop) collapse();
  }, [expanded, isDesktop, collapse]);

  // Escape restores the card; lock page scroll while expanded.
  useEffect(() => {
    if (!expanded) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        collapse();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, collapse]);

  const renderState: WindowFrameRenderState = { expanded };
  const resolvedBodyClassName =
    typeof bodyClassName === "function" ? bodyClassName(renderState) : bodyClassName;
  const resolvedChildren = typeof children === "function" ? children(renderState) : children;

  return (
    <>
      {expanded ? (
        <button
          type="button"
          className="fixed inset-0 z-50 cursor-default bg-background/70 backdrop-blur-[2px]"
          onClick={collapse}
          aria-label="Dismiss expanded card"
        />
      ) : null}

      {/*
        In-flow shell: placeholder height while maximized. The chrome frame itself
        takes consumer className (hover border, w-full, …); when expanded, fixed
        insets + inline width:auto beat w-full so the card can't spill past the
        viewport.
      */}
      <div className="min-w-0 w-full" style={expanded ? { height: placeholderHeight } : undefined}>
        <div
          ref={frameRef}
          role={expanded ? "dialog" : undefined}
          aria-modal={expanded ? true : undefined}
          aria-labelledby={expanded ? labelId : undefined}
          style={
            expanded
              ? { top: "6rem", right: "10rem", bottom: "6rem", left: "10rem", width: "auto" }
              : undefined
          }
          className={cn(
            "overflow-hidden rounded-lg border border-border bg-surface-raised/50 shadow-[0_1px_0_rgba(0,0,0,0.02)]",
            className,
            expanded &&
              "fixed z-[51] flex flex-col bg-surface-raised shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
            shaking && "gr-window-shake",
          )}
          onAnimationEnd={(event) => {
            if (event.target === frameRef.current && event.animationName === "gr-window-shake") {
              setShaking(false);
            }
          }}
        >
          <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-background/70 px-4 py-2.5">
            <div className="group/lights flex items-center gap-1.5">
              <TrafficLight
                tone="close"
                label="Close"
                onClick={() => {
                  if (expanded) collapse();
                  else deny();
                }}
              />
              <TrafficLight
                tone="minimize"
                label="Minimize"
                onClick={() => {
                  if (expanded) collapse();
                  else deny();
                }}
              />
              <TrafficLight
                tone="maximize"
                label={expanded ? "Restore" : "Maximize"}
                expanded={expanded}
                onClick={toggleMaximize}
              />
            </div>
            <span id={labelId} className="ml-2.5 truncate font-mono text-xs text-muted">
              {label}
            </span>
          </div>
          <div
            className={cn(
              "p-4 sm:p-6 md:p-8",
              // flex-col so media children can fill height (e.g. ProductVideo).
              expanded && "flex min-h-0 flex-1 flex-col overflow-y-auto",
              resolvedBodyClassName,
            )}
          >
            {resolvedChildren}
          </div>
        </div>
      </div>
    </>
  );
}

type TrafficTone = "close" | "minimize" | "maximize";

type TrafficLightProps = {
  tone: TrafficTone;
  label: string;
  onClick: () => void;
  expanded?: boolean;
};

const toneClasses: Record<TrafficTone, string> = {
  close: "bg-danger/70 text-[#5c1a16] group-hover/lights:bg-danger",
  minimize: "bg-syntax-variable/70 text-[#6b3d00] group-hover/lights:bg-syntax-variable",
  maximize: "bg-diff-add/70 text-[#0d3d1a] group-hover/lights:bg-diff-add",
};

function TrafficLight({ tone, label, onClick, expanded = false }: TrafficLightProps) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex h-3 w-3 shrink-0 items-center justify-center rounded-full transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        toneClasses[tone],
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center opacity-0 transition-opacity duration-100",
          "group-hover/lights:opacity-100 group-focus-within/lights:opacity-100",
        )}
        aria-hidden="true"
      >
        {tone === "close" ? <CloseGlyph /> : null}
        {tone === "minimize" ? <MinimizeGlyph /> : null}
        {tone === "maximize" ? expanded ? <RestoreGlyph /> : <MaximizeGlyph /> : null}
      </span>
    </button>
  );
}

/** Classic macOS traffic-light glyphs (shown on group hover). */
function CloseGlyph() {
  return (
    <svg width="6" height="6" viewBox="0 0 12 12" fill="none">
      <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MinimizeGlyph() {
  return (
    <svg width="6" height="6" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Plus — classic macOS maximize. */
function MaximizeGlyph() {
  return (
    <svg width="6" height="6" viewBox="0 0 12 12" fill="none">
      <path
        d="M6 2.75v6.5M2.75 6h6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Two opposing corner arrows — restore from expanded. */
function RestoreGlyph() {
  return (
    <svg width="6" height="6" viewBox="0 0 12 12" fill="none">
      <path
        d="M4.25 2.75H2.75v1.5M7.75 9.25h1.5v-1.5M2.75 7.75v1.5h1.5M9.25 4.25v-1.5h-1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
