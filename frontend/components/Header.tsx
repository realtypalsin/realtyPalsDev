"use client";

import React from 'react';
import { User } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface HeaderProps {
    title: string;
    onToast?: (message: string) => void;
}

export default function Header({ title }: HeaderProps) {
    return (
        <header className="flex-shrink-0 pl-14 pr-4 md:px-8 h-[73px] md:h-[88px] flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-300 z-30 sticky top-0 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-1 md:gap-3 min-w-0 flex-1 mr-2 px-1">
                <div className="flex-1 min-w-0">
                    {/* Mobile: single-line context title */}
                    <div className="md:hidden flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[180px]">
                            {title}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                    </div>
                    {/* Desktop: plain title — no animation to prevent scramble during streaming re-renders */}
                    <div className="hidden md:block truncate">
                        <span className="text-lg md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 tracking-tight">
                            {title}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                <div className="flex items-center gap-1 md:gap-3 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-full border border-gray-200/50 dark:border-gray-700/50">
                    <ThemeToggle />
                </div>

                <div className="group relative">
                    <div className="w-11 h-11 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-lg overflow-hidden relative">
                        <User size={22} className="text-white drop-shadow-sm" />
                    </div>
                </div>
            </div>
        </header>
    );
}
