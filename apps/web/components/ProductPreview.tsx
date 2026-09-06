"use client";

import { useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Button } from "@guided-review/ui";
import { WindowFrame } from "./WindowFrame";

export function ProductPreview() {
  const [Preview, setPreview] = useState<ComponentType<{ onClose: () => void }> | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  async function openPreview() {
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
  }

  function closePreview() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <WindowFrame label="sample-review" className="mt-12" bodyClassName="relative">
        <img
          src="/product-preview/thumbnail.webp"
          alt="Guided Review showing a code diff and ordered review units"
          width={1600}
          height={1000}
          className="block h-auto w-full"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60">
          <Button
            ref={triggerRef}
            onClick={() => void openPreview()}
            disabled={loading}
            aria-haspopup="dialog"
          >
            {loading ? "Opening preview…" : "Try live preview"}
          </Button>
          <p className="m-0 text-sm text-foreground" role="status">
            {error
              ? "The preview failed to load. Try opening it again."
              : "Explore a sample review. No setup or API key needed."}
          </p>
        </div>
      </WindowFrame>
      {open && Preview && createPortal(<Preview onClose={closePreview} />, document.body)}
    </>
  );
}
