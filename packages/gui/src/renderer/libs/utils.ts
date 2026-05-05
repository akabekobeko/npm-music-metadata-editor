import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names and automatically merges conflicting Tailwind CSS utility classes.
 * @param inputs - Class names to combine. Supports strings, arrays, and object syntax.
 * @returns The merged class name string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
