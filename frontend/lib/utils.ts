import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function resolveImgUrl(url: string | null | undefined): string {
  if (!url) return '';
  // Relative paths (e.g. /images/...) are served by the Next.js public directory.
  // Absolute paths (e.g. https://...) are returned as-is.
  return url;
}
