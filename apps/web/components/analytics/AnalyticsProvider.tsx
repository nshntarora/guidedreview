"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { createAnalyticsClient, type AnalyticsClient } from "@web/lib/analytics";

const AnalyticsContext = createContext<AnalyticsClient | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => createAnalyticsClient(), []);

  useEffect(() => {
    client.init();
  }, [client]);

  return <AnalyticsContext.Provider value={client}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsClient {
  const client = useContext(AnalyticsContext);
  if (!client) {
    // Safe fallback if a leaf renders outside the provider.
    return createAnalyticsClient({ enabled: false });
  }
  return client;
}
