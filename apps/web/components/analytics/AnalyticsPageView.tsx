"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAnalytics } from "./AnalyticsProvider";

/**
 * Captures a pageview on mount and whenever the App Router path/query changes.
 * Must sit under AnalyticsProvider. useSearchParams requires a Suspense boundary.
 */
function AnalyticsPageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const analytics = useAnalytics();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = searchParams?.toString();
    const url = search ? `${window.location.origin}${pathname}?${search}` : window.location.href;
    analytics.capturePageview(url);
  }, [analytics, pathname, searchParams]);

  return null;
}

export function AnalyticsPageView() {
  return (
    <Suspense fallback={null}>
      <AnalyticsPageViewInner />
    </Suspense>
  );
}
