'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from '@phosphor-icons/react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  const updateFavicon = (isDark: boolean) => {
    const iconUrl = isDark ? '/images/icons/faviconWhite.svg' : '/images/icons/faviconBlack.svg';
    document.querySelectorAll("link[rel*='icon']").forEach((link) => {
      (link as HTMLLinkElement).href = iconUrl;
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    // Default to light mode as requested. Only use dark mode if explicitly set.
    const isDark = stored === 'dark';
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    updateFavicon(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    updateFavicon(next);
  };

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/90 dark:bg-white/10 rounded-full transition-all duration-300 border border-gray-200/80 dark:border-white/10 shadow-xs hover:bg-white dark:hover:bg-white/20 active:scale-95 cursor-pointer"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? (
        <Sun size={17} weight="duotone" className="text-amber-400" />
      ) : (
        <Moon size={17} weight="duotone" className="text-gray-700" />
      )}
    </button>
  );
}
