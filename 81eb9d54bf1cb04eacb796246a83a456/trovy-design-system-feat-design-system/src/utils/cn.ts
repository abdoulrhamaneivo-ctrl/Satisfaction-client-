/**
 * `cn` — small class-name composer.
 *
 * Wraps `clsx` (conditional classNames) + `tailwind-merge` (resolves
 * conflicting Tailwind classes, e.g. `p-2 p-4` → `p-4`). Every primitive
 * in this package uses it, and every app should use it for any className
 * prop that could be overridden.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
