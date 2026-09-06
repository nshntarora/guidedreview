"use client";

import { useState } from "react";
import { Button, cn } from "@guided-review/ui";

type CopyButtonProps = {
  text: string;
  className?: string;
};

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked; fail silently.
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy code"}
      className={cn("px-2 py-1 text-xs", className)}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
