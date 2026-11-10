"use client";

import { useEffect, useState } from "react";
import { Button, cn } from "@guided-review/ui";
import { useAnalytics } from "@web/components/analytics/AnalyticsProvider";
import { AnalyticsEvents, type CtaLocation } from "@web/lib/analytics";

type CopyButtonProps = {
  text: string;
  className?: string;
  cliLocation?: CtaLocation;
};

export function CopyButton({ text, className, cliLocation }: CopyButtonProps) {
  const analytics = useAnalytics();
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (status !== "copied") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      if (cliLocation) {
        analytics.capture(AnalyticsEvents.INSTALL_CLI_CLICK, {
          location: cliLocation,
          method: "copy",
        });
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      data-testid="copy-code"
      aria-label={
        status === "copied"
          ? "Copied"
          : status === "error"
            ? "Copy failed. Try again or select the code and copy it manually."
            : "Copy code"
      }
      title={status === "error" ? "Select the code and copy it manually, or try again." : undefined}
      className={cn("px-2 py-1 text-xs", className)}
    >
      <span role="status">
        {status === "copied" ? "Copied" : status === "error" ? "Retry copy" : "Copy"}
      </span>
    </Button>
  );
}
