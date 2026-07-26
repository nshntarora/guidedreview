import { clsx, type ClassValue } from "clsx";

/** Join class names; falsy values are omitted. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
