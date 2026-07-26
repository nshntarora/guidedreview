import { cn } from "../cn";

export interface BrandMarkProps {
  title?: string;
  /** Resolved URL or imported asset URL for the product icon. */
  iconSrc: string;
  className?: string;
}

export function BrandMark({ title = "Guided Review", iconSrc, className }: BrandMarkProps) {
  return (
    <div className={cn("mb-2 flex items-center gap-3", className)}>
      <img
        className="h-10 w-10 shrink-0 rounded-lg"
        src={iconSrc}
        alt=""
        width={40}
        height={40}
        aria-hidden="true"
      />
      <h1 className="m-0 text-lg font-bold">{title}</h1>
    </div>
  );
}
