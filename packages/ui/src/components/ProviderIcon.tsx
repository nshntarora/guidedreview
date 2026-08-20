import { cn } from "../cn";

interface ProviderIconProps {
  src: string;
  /** Pixel size (width & height). Defaults to 16. */
  size?: number;
  /** Invert a dark-on-transparent mark (OpenAI) so it stays visible on dark chrome. */
  invert?: boolean;
  className?: string;
}

/** Decorative provider logo. */
export function ProviderIcon({ src, size = 16, invert = false, className }: ProviderIconProps) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      aria-hidden="true"
      className={cn("shrink-0 object-contain", invert && "invert", className)}
      style={{ width: size, height: size }}
    />
  );
}
