'use client';

import React, { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Home,
  Key,
  Crown,
  Trees,
  Shield,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { HOME_BUTTON_GROUPS } from '@/lib/homeButtons';

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 size={13} className="text-white" />,
  Home: <Home size={13} className="text-white" />,
  Key: <Key size={13} className="text-white" />,
  Crown: <Crown size={13} className="text-white" />,
  Trees: <Trees size={13} className="text-white" />,
  Shield: <Shield size={13} className="text-white" />
};

interface HomeButtonsProps {
  onButtonClick: (prompt: string) => void;
}

export default function HomeButtons({ onButtonClick }: HomeButtonsProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId((prev) => (prev === id ? null : id));
  };

  const handleMainClick = (prompt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    onButtonClick(prompt);
  };

  const handleOptionSelect = (prompt: string) => {
    setOpenDropdownId(null);
    onButtonClick(prompt);
  };

  return (
    <div ref={containerRef} className="w-full flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto px-2">
      {HOME_BUTTON_GROUPS.map((group, index) => {
        const isOpen = openDropdownId === group.id;
        const alignClass =
          index % 3 === 0
            ? 'left-0 origin-top-left'
            : index % 3 === 2
            ? 'right-0 origin-top-right'
            : 'left-1/2 -translate-x-1/2 origin-top';

        return (
          <div key={group.id} className="relative">
            <m.div
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className={`group flex items-center rounded-full text-xs font-semibold border transition-all duration-200 shadow-xs ${
                isOpen
                  ? 'bg-white dark:bg-[#18181c] border-blue-500/80 dark:border-blue-400/80 text-zinc-900 dark:text-zinc-100 ring-2 ring-blue-500/25 shadow-md'
                  : 'bg-white/90 dark:bg-[#141416]/90 backdrop-blur-md border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
              }`}
            >
              {/* Left Main Clickable Button */}
              <button
                type="button"
                onClick={(e) => handleMainClick(group.primaryPrompt, e)}
                className="flex items-center gap-2 pl-3 py-1.5 pr-2.5 rounded-l-full cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 transition-colors group/main min-w-0"
                title={`Ask: "${group.primaryPrompt}"`}
              >
                <span className={`flex-shrink-0 p-1.5 rounded-full bg-gradient-to-br shadow-xs transition-transform duration-200 group-hover/main:scale-110 ${group.badgeGradient}`}>
                  {iconMap[group.icon]}
                </span>
                <span className="truncate group-hover/main:text-blue-600 dark:group-hover/main:text-blue-400 transition-colors tracking-tight">
                  {group.title}
                </span>
              </button>

              {/* Vertical Subtle Gradient Divider */}
              <div className="h-4 w-px bg-gradient-to-b from-transparent via-zinc-200 dark:via-zinc-800 to-transparent shrink-0" />

              {/* Right Dropdown Toggle Button */}
              <button
                type="button"
                onClick={(e) => handleToggle(group.id, e)}
                className={`pl-2 pr-3 py-2.5 rounded-r-full cursor-pointer transition-all flex items-center justify-center shrink-0 ${
                  isOpen
                    ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70'
                }`}
                title="More preset queries"
              >
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-300 ease-out ${
                    isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                  }`}
                />
              </button>
            </m.div>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isOpen && (
                <m.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className={`absolute top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white/98 dark:bg-[#141416]/98 backdrop-blur-2xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] p-2 ${alignClass}`}
                >
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase bg-blue-50/60 dark:bg-blue-950/40 rounded-xl mb-1.5 border border-blue-100/60 dark:border-blue-900/40">
                    <Sparkles size={11} className="text-blue-500 shrink-0" />
                    <span>Popular Queries</span>
                  </div>

                  <div className="space-y-1">
                    {group.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(option.prompt)}
                        className="group/item w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/30 dark:hover:from-blue-950/40 dark:hover:to-indigo-950/20 cursor-pointer border border-transparent hover:border-blue-200/40 dark:hover:border-blue-800/40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors leading-snug">
                            {option.label}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal leading-snug mt-0.5 line-clamp-2">
                            {option.prompt}
                          </div>
                        </div>
                        <ChevronRight
                          size={14}
                          className="text-zinc-400 dark:text-zinc-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 group-hover/item:translate-x-0.5 transition-all shrink-0 opacity-0 group-hover/item:opacity-100"
                        />
                      </button>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}


