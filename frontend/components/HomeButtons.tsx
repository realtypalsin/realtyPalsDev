'use client';

import React, { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Buildings,
  House,
  Key,
  Crown,
  Tree,
  ShieldCheck,
  Sparkle,
  Stack,
  CaretDown,
  CaretRight,
  Funnel
} from '@phosphor-icons/react';
import { HOME_BUTTON_GROUPS } from '@/lib/homeButtons';

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Buildings size={14} weight="duotone" />,
  Home: <House size={14} weight="duotone" />,
  Key: <Key size={14} weight="duotone" />,
  Crown: <Crown size={14} weight="duotone" />,
  Trees: <Tree size={14} weight="duotone" />,
  Shield: <ShieldCheck size={14} weight="duotone" />,
  Sparkles: <Sparkle size={14} weight="duotone" />,
  Layers: <Stack size={14} weight="duotone" />
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
    <div ref={containerRef} className="w-full max-w-4xl mx-auto px-2">
      {/* Mobile: Clean 2-Column Grid (ChatGPT/Claude mobile style) */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        {HOME_BUTTON_GROUPS.filter(group => group.options && group.options.length > 0).slice(0, 6).map((group) => {
          const isOpen = openDropdownId === group.id;
          return (
            <div key={group.id} className="relative">
              <m.div
                whileTap={{ scale: 0.96 }}
                className={`group flex items-center justify-between rounded-xl text-xs font-semibold border transition-all duration-200 p-2 shadow-2xs ${
                  isOpen
                    ? 'bg-white dark:bg-[#18181c] border-blue-500/80 dark:border-blue-400/80 text-zinc-900 dark:text-zinc-100 ring-2 ring-blue-500/25 shadow-md'
                    : 'bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs'
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => handleMainClick(group.primaryPrompt, e)}
                  className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
                  title={group.primaryPrompt}
                >
                  <span className={`flex-shrink-0 p-1 rounded-lg ${group.colorClass}`}>
                    {iconMap[group.icon]}
                  </span>
                  <span className="truncate font-bold text-[11.5px] leading-tight text-zinc-800 dark:text-zinc-200">
                    {group.title.replace(' in Noida', '').replace(' Noida', '')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleToggle(group.id, e)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 ml-1 cursor-pointer"
                  title="Options"
                >
                  <CaretDown size={12} weight="bold" className={`transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
                </button>
              </m.div>

              <AnimatePresence>
                {isOpen && (
                  <m.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-white dark:bg-[#18181c] border border-zinc-200 dark:border-zinc-800 shadow-xl p-1.5 min-w-[220px]"
                  >
                    <div className="space-y-0.5">
                      {group.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(option.prompt)}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 truncate cursor-pointer"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Desktop: Horizontal Flowing Pills */}
      <div className="hidden sm:flex flex-wrap items-center justify-center gap-2.5">
        {HOME_BUTTON_GROUPS.filter(group => group.options && group.options.length > 0).map((group, index) => {
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
                className={`group flex items-center rounded-full text-xs font-semibold border transition-all duration-200 shadow-2xs ${
                  isOpen
                    ? 'bg-white dark:bg-[#18181c] border-blue-500/80 dark:border-blue-400/80 text-zinc-900 dark:text-zinc-100 ring-2 ring-blue-500/25 shadow-md'
                    : 'bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs'
                }`}
              >
                {/* Left Main Clickable Button */}
                <button
                  type="button"
                  onClick={(e) => handleMainClick(group.primaryPrompt, e)}
                  className="flex items-center gap-2 pl-3 py-1.5 pr-2.5 rounded-l-full cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 transition-colors group/main min-w-0"
                  title={`Ask: "${group.primaryPrompt}"`}
                >
                  <span className={`flex-shrink-0 p-1.5 rounded-full transition-all duration-200 group-hover/main:scale-110 ${group.colorClass}`}>
                    {iconMap[group.icon]}
                  </span>
                  <span className="truncate group-hover/main:text-blue-600 dark:group-hover/main:text-blue-400 transition-colors tracking-tight font-bold">
                    {group.title}
                  </span>
                </button>

                {/* Vertical Subtle Divider */}
                <div className="h-4 w-px bg-zinc-200/80 dark:bg-zinc-800/90 shrink-0" />

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
                  <CaretDown
                    size={13}
                    weight="bold"
                    className={`transition-transform duration-300 ease-out ${
                      isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                    }`}
                  />
                </button>
              </m.div>

              {/* Compact & Refined Expanded Dropdown Menu */}
              <AnimatePresence>
                {isOpen && (
                  <m.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className={`absolute top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-[#18181c] border border-zinc-200/90 dark:border-zinc-800 shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-1.5 ${alignClass}`}
                  >
                    <div className="px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase border-b border-zinc-100 dark:border-zinc-800/80 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Funnel size={11} weight="bold" className="text-zinc-400" />
                        PRESETS
                      </span>
                      <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500">
                        {group.options.length} options
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {group.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(option.prompt)}
                          className="group/item w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-all duration-150 hover:bg-blue-50/80 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                          title={option.prompt}
                        >
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors truncate">
                            {option.label}
                          </span>
                          <CaretRight
                            size={13}
                            weight="bold"
                            className="text-zinc-300 dark:text-zinc-600 group-hover/item:text-blue-500 group-hover/item:translate-x-0.5 transition-all flex-shrink-0"
                          />
                        </button>
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
