'use client';

import React, { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Buildings,
  House,
  Key,
  Crown,
  Tree,
  Stack,
  CaretDown,
  CaretRight,
  MapPin,
  CurrencyInr,
  Sparkle
} from '@phosphor-icons/react';
import { HOME_BUTTON_GROUPS } from '@/lib/homeButtons';

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Buildings size={14} weight="bold" />,
  Home: <House size={14} weight="bold" />,
  Key: <Key size={14} weight="bold" />,
  Crown: <Crown size={14} weight="bold" />,
  Trees: <Tree size={14} weight="bold" />,
  Layers: <Stack size={14} weight="bold" />,
  MapPin: <MapPin size={14} weight="bold" />,
  CurrencyInr: <CurrencyInr size={14} weight="bold" />,
};

const groupHoverStyles: Record<string, { pillHover: string; iconHover: string }> = {
  budget_3bhk: {
    pillHover: 'hover:border-amber-400/80 dark:hover:border-amber-500/70 hover:bg-amber-50/80 dark:hover:bg-amber-950/40 text-zinc-700 dark:text-zinc-300 hover:text-amber-900 dark:hover:text-amber-200',
    iconHover: 'text-amber-500 group-hover:text-amber-600 dark:group-hover:text-amber-400',
  },
  sec75: {
    pillHover: 'hover:border-blue-400/80 dark:hover:border-blue-500/70 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 text-zinc-700 dark:text-zinc-300 hover:text-blue-900 dark:hover:text-blue-200',
    iconHover: 'text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400',
  },
  sec78: {
    pillHover: 'hover:border-purple-400/80 dark:hover:border-purple-500/70 hover:bg-purple-50/80 dark:hover:bg-purple-950/40 text-zinc-700 dark:text-zinc-300 hover:text-purple-900 dark:hover:text-purple-200',
    iconHover: 'text-purple-500 group-hover:text-purple-600 dark:group-hover:text-purple-400',
  },
  sec79: {
    pillHover: 'hover:border-teal-400/80 dark:hover:border-teal-500/70 hover:bg-teal-50/80 dark:hover:bg-teal-950/40 text-zinc-700 dark:text-zinc-300 hover:text-teal-900 dark:hover:text-teal-200',
    iconHover: 'text-teal-500 group-hover:text-teal-600 dark:group-hover:text-teal-400',
  },
  sec10: {
    pillHover: 'hover:border-indigo-400/80 dark:hover:border-indigo-500/70 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 text-zinc-700 dark:text-zinc-300 hover:text-indigo-900 dark:hover:text-indigo-200',
    iconHover: 'text-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
  },
  sec12: {
    pillHover: 'hover:border-rose-400/80 dark:hover:border-rose-500/70 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 text-zinc-700 dark:text-zinc-300 hover:text-rose-900 dark:hover:text-rose-200',
    iconHover: 'text-rose-500 group-hover:text-rose-600 dark:group-hover:text-rose-400',
  },
};

const defaultHover = {
  pillHover: 'hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100',
  iconHover: 'text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300',
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
    <div ref={containerRef} className="w-full max-w-3xl mx-auto px-2">
      {/* Clean fixed wrapping pills — 4 fixed buttons on mobile without horizontal scroll, full set on desktop */}
      <div className="flex flex-wrap items-center justify-center gap-2 w-full py-1">
        {HOME_BUTTON_GROUPS.map((group, idx) => {
          // On mobile, show top 4 primary buttons to fit cleanly without scroll; on sm+ show all
          const isExtraOnMobile = idx >= 4;
          const isOpen = openDropdownId === group.id;
          const hasOptions = group.options && group.options.length > 0;
          const style = groupHoverStyles[group.id] || defaultHover;

          return (
            <div key={group.id} className={`relative ${isExtraOnMobile ? 'hidden sm:block' : 'block'}`}>
              <m.div
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`group flex items-center rounded-full text-xs font-medium border transition-all duration-150 shadow-2xs whitespace-nowrap ${
                  isOpen
                    ? 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : `bg-white/80 dark:bg-zinc-800/50 border-zinc-200/70 dark:border-zinc-700/60 ${style.pillHover}`
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => handleMainClick(group.primaryPrompt, e)}
                  className={`flex items-center gap-1.5 pl-3 py-1.5 ${hasOptions ? 'pr-1.5' : 'pr-3'} cursor-pointer min-w-0`}
                  title={`Ask: "${group.primaryPrompt}"`}
                >
                  <span className={`transition-colors ${style.iconHover}`}>
                    {iconMap[group.icon] || <Sparkle size={13} weight="bold" />}
                  </span>
                  <span className="truncate tracking-tight font-medium text-[12px] sm:text-[12.5px]">
                    {group.title}
                  </span>
                </button>

                {hasOptions && (
                  <button
                    type="button"
                    onClick={(e) => handleToggle(group.id, e)}
                    className="pr-2.5 pl-1 py-1.5 cursor-pointer text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors flex items-center justify-center"
                    title="More options"
                  >
                    <CaretDown
                      size={11}
                      weight="bold"
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-zinc-700 dark:text-zinc-200' : ''}`}
                    />
                  </button>
                )}
              </m.div>

              {/* Minimal Clean Dropdown */}
              <AnimatePresence>
                {isOpen && (
                  <m.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-1.5 z-50 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl p-1 left-0 sm:left-1/2 sm:-translate-x-1/2"
                  >
                    <div className="space-y-0.5">
                      {group.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(option.prompt)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                          title={option.prompt}
                        >
                          <span className="truncate font-medium">{option.label}</span>
                          <CaretRight size={11} weight="bold" className="text-zinc-400 shrink-0" />
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
    </div>
  );
}
