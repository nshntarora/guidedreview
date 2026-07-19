import type { ReactNode } from "react";

interface KbdProps {
  children: ReactNode;
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-gr-border border-b-2 bg-gr-subtle px-[5px] font-mono text-[11px] leading-none text-gr-muted">
      {children}
    </kbd>
  );
}
