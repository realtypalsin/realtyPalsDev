'use client';

import React, { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Home,
  Key,
  Crown,
  Trees,
  Wallet,
  Sparkles,
  Shield,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { HOME_BUTTON_GROUPS } from '@/lib/homeButtons';

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 size={13} />,
  Home: <Home size={13} />,
  Key: <Key size={13} />,
  Crown: <Crown size={13} />,
  Trees: <Trees size={13} />,
  Wallet: <Wallet size={13} />,
  Sparkles: <Sparkles size={13} />,
  Shield: <Shield size={13} />
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

  const handleToggle = (id: string) => {
    setOpenDropdownId((prev) => (prev === id ? null : id));
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
            <m.button
              whileHover={{ y: -1.5, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={() => handleToggle(group.id)}
              className={`group flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer shadow-2xs ${
                isOpen
                  ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 ring-2 ring-blue-500/20'
                  : 'bg-white dark:bg-[#161616] hover:bg-zinc-50 dark:hover:bg-[#1f1f1f] border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <span className={`flex-shrink-0 p-1 rounded-full transition-transform group-hover:scale-105 ${group.colorClass}`}>
                {iconMap[group.icon]}
              </span>
              <span className="truncate">{group.title}</span>
              <ChevronDown
                size={13}
                className={`text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform duration-200 shrink-0 ${
                  isOpen ? 'rotate-180 text-blue-500 dark:text-blue-400' : ''
                }`}
              />
            </m.button>

            <AnimatePresence>
              {isOpen && (
                <m.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className={`absolute top-full mt-2 z-50 w-76 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white/98 dark:bg-[#141416]/98 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/90 shadow-[0_16px_36px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.6)] p-1.5 ${alignClass}`}
                >
                  <div className="px-3 pt-2 pb-1.5 text-[10px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase border-b border-zinc-100 dark:border-zinc-800/60 mb-1">
                    Select Query
                  </div>

                  <div className="space-y-0.5">
                    {group.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(option.prompt)}
                        className="group/item w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors leading-snug">
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
