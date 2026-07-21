import { cn } from "@guided-review/ui";
import type { ProviderId } from "../../lib/types";
import { getProvider } from "../../lib/providers/catalog";

interface ProviderIconProps {
  provider: ProviderId;
  /** Pixel size (width & height). Defaults to 16. */
  size?: number;
  className?: string;
}

/**
 * Decorative provider logo. OpenAI's monochrome mark is inverted in dark mode
 * so it stays visible on both options-page themes.
 */
export function ProviderIcon({ provider, size = 16, className }: ProviderIconProps) {
  const def = getProvider(provider);
  const src =
    typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL(def.iconSrc)
      : `/${def.iconSrc}`;

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      aria-hidden="true"
      className={cn(
        "shrink-0 object-contain",
        // OpenAI asset is dark-on-transparent; invert for dark color scheme.
        provider === "openai" && "dark:invert",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
