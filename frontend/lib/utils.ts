import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
<<<<<<< HEAD
=======

export function resolveImgUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder.png';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return url;
  return '/' + url;
}
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
