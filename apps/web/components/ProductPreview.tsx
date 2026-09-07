"use client";

import { useCallback, useEffect, useId, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Button, ModalShell } from "@guided-review/ui";
import { OPEN_LIVE_PREVIEW_EVENT, ariaKeyShortcuts, SITE_SHORTCUTS } from "@web/lib/shortcuts";
import { ShortcutChord } from "./ShortcutChord";
import { WindowFrame } from "./WindowFrame";

const LIVE_PREVIEW_MEDIA_QUERY = "(min-width: 768px)";

function MobilePreviewNotice({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const bodyId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <ModalShell
      position="fixed"
      zIndexClassName="z-[60]"
      scrimTestId="live-preview-mobile-notice-scrim"
      onScrimDismiss={onClose}
      maxWidthClassName="max-w-[420px]"
      panelProps={{
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "aria-describedby": bodyId,
        "data-testid": "live-preview-mobile-notice",
      }}
    >
      <div className="flex flex-col gap-2 px-4 py-4">
        <h2 id={titleId} className="m-0 text-lg font-semibold text-foreground">
          Live preview needs a larger screen
        </h2>
        <p id={bodyId} className="m-0 text-base leading-relaxed text-muted">
          Guided Review&apos;s live preview is available on larger screens. Switch to one and try
          again.
        </p>
      </div>
      <div className="flex justify-end border-t border-border px-4 py-3">
        <Button
          ref={closeRef}
          size="sm"
          onClick={onClose}
          data-testid="live-preview-mobile-dismiss"
        >
          Got it
        </Button>
      </div>
    </ModalShell>,
    document.body,
  );
}

export function ProductPreview() {
  const [Preview, setPreview] = useState<ComponentType<{ onClose: () => void }> | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [mobileNoticeOpen, setMobileNoticeOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openPreview = useCallback(async () => {
    if (loading) return;
    if (!window.matchMedia(LIVE_PREVIEW_MEDIA_QUERY).matches) {
      setMobileNoticeOpen(true);
      return;
    }
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

  function closeMobileNotice() {
    setMobileNoticeOpen(false);
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
              data-testid="open-live-preview"
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
      {mobileNoticeOpen && <MobilePreviewNotice onClose={closeMobileNotice} />}
    </>
  );
}
