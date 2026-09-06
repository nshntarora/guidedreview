"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@guided-review/ui";
import { CLI_INSTALL_COMMAND } from "@web/lib/links";
import { ariaKeyShortcuts } from "@web/lib/shortcuts";
import { ShortcutChord } from "./ShortcutChord";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function hasTextSelection(): boolean {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().length > 0);
}

/** Copyable install command for the homepage Install section. */
export function InstallCommands() {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CLI_INSTALL_COMMAND);
      setCopied(true);
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked; fail silently.
    }
  }, []);

  // ⌘/Ctrl+C copies the install command (skips when the user has a text selection).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.repeat) return;
      if (event.key.toLowerCase() !== "c") return;
      if (isEditableTarget(event.target)) return;
      if (hasTextSelection()) return;

      event.preventDefault();
      void handleCopy();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    };
  }, [handleCopy]);

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-lg leading-relaxed text-muted">In your project directory, run:</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4">
        <pre className="m-0 flex min-w-0 flex-1 items-center overflow-x-auto rounded-md border border-border bg-background px-4 py-3 font-mono text-base leading-relaxed text-foreground sm:text-lg">
          <code>{CLI_INSTALL_COMMAND}</code>
        </pre>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleCopy}
          aria-label={copied ? "Copied install command" : "Copy install command"}
          aria-keyshortcuts={ariaKeyShortcuts("c")}
          className="h-auto shrink-0 self-stretch"
        >
          {copied ? "Copied" : "Copy"}
          <ShortcutChord keyLabel="c" />
        </Button>
      </div>
      <p className="m-0 text-lg leading-relaxed text-muted">
        The server will start up. Requires Node.js 22+.
      </p>
    </div>
  );
}
