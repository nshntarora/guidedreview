"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import {
  createAnalyticsClient,
  getAnalyticsConfig,
  type AnalyticsClient,
  type AnalyticsConfig,
} from "../../lib/analytics";

const AnalyticsContext = createContext<AnalyticsClient | null>(null);

type AnalyticsProviderProps = {
  children: ReactNode;
  /** Optional override for tests; defaults to build-time env config. */
  config?: AnalyticsConfig;
};

export function AnalyticsProvider({ children, config }: AnalyticsProviderProps) {
  const resolved = useMemo(() => config ?? getAnalyticsConfig(), [config]);
  const client = useMemo(() => createAnalyticsClient(resolved), [resolved]);

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
