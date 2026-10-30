import { cn } from "@guided-review/ui";

export function SkeletonBar({ className }: { className: string }) {
  return <div className={cn("h-3 rounded bg-border motion-safe:animate-pulse", className)} />;
}
