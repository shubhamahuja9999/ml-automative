import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as a pound-sterling string (e.g. £23,510). */
export function gbp(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}
