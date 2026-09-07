"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Button } from "@guided-review/ui";
import { OPEN_LIVE_PREVIEW_EVENT, ariaKeyShortcuts, SITE_SHORTCUTS } from "@web/lib/shortcuts";
import { ShortcutChord } from "./ShortcutChord";
import { WindowFrame } from "./WindowFrame";

export function ProductPreview() {
  const [Preview, setPreview] = useState<ComponentType<{ onClose: () => void }> | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openPreview = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      const module = await import("./preview/Preview");
      setPreview(() => module.default);
      setOpen(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    window.addEventListener(OPEN_LIVE_PREVIEW_EVENT, openPreview);
    return () => window.removeEventListener(OPEN_LIVE_PREVIEW_EVENT, openPreview);
  }, [openPreview]);

  function closePreview() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <WindowFrame
        label="guided-review --base main"
        className="mt-12"
        bodyClassName="p-0 sm:p-0 md:p-0"
      >
        <div className="relative overflow-hidden bg-surface">
          <img
            src="/product-preview/thumbnail.webp"
            alt="Guided Review CLI showing a local code diff and ordered review units"
            width={1600}
            height={1000}
            className="block h-auto min-h-96 w-full scale-[1.01] object-cover blur-[1px] sm:min-h-0"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/75 to-transparent backdrop-blur-xl [mask-image:linear-gradient(to_top,black_55%,transparent)]" />
          <div className="absolute inset-x-0 bottom-0 grid items-center gap-5 px-5 py-5 text-left sm:px-8 sm:py-7 md:grid-cols-[1fr_auto] md:gap-8">
            <div>
              <p className="m-0 text-xl font-semibold tracking-tight text-foreground font-brand sm:text-2xl">
                Try it out without installing anything
              </p>
              <p
                className="mt-2 mb-0 text-base leading-relaxed text-muted sm:text-lg"
                role="status"
              >
                {error
                  ? "The preview failed to load. Try opening it again."
                  : "Play around with Guided Review before you decide to install"}
              </p>
            </div>
            <Button
              ref={triggerRef}
              data-live-preview-trigger
              onClick={() => void openPreview()}
              disabled={loading}
              aria-haspopup="dialog"
              aria-keyshortcuts={ariaKeyShortcuts(SITE_SHORTCUTS.preview.key)}
              size="lg"
              className="pointer-events-auto w-full whitespace-nowrap md:w-auto"
            >
              {loading ? "Opening Preview…" : "Open Live Preview"}
              {!loading && <ShortcutChord keyLabel={SITE_SHORTCUTS.preview.key} />}
            </Button>
          </div>
        </div>
      </WindowFrame>
      {open && Preview && createPortal(<Preview onClose={closePreview} />, document.body)}
    </>
  );
}
