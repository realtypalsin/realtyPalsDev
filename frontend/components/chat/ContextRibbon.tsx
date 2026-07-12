'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import type { ConversationState } from './types';

interface ContextRibbonProps {
  intent: Record<string, unknown> | null;
  onRemove: (field: string) => void;
}

export default function ContextRibbon({ intent, onRemove }: ContextRibbonProps) {
  if (!intent) return null;

  // We only want to display certain fields that are meaningful to the user
  const displayFields = ['sector', 'bhk', 'budgetMax', 'budgetMin', 'builderName', 'possession'];

  const activeFilters = Object.entries(intent)
    .filter(([key, value]) => displayFields.includes(key) && value !== null && value !== undefined && value !== '')
    .map(([key, value]) => {
      let label = String(value);
      if (key === 'bhk' && Array.isArray(value)) label = `${value.join(', ')} BHK`;
      if (key === 'budgetMax') label = `Max ₹${value}Cr`;
      if (key === 'budgetMin') label = `Min ₹${value}Cr`;
      if (key === 'possession') {
        const possessionLabels: Record<string, string> = {
          immediate: 'Ready to Move',
          '1year': 'Within 1 Year',
          '2year': 'Within 2 Years',
          '3year+': '3+ Years',
        };
        label = possessionLabels[label] || label;
      }
      return { field: key, label };
    });

  if (activeFilters.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full flex justify-center py-3 absolute top-14 left-0 z-20 pointer-events-none"
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-3xl px-4 pointer-events-auto bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-full py-1.5 px-3 shadow-sm">
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mr-1 flex items-center gap-1">
          <Search size={12} className="text-gray-400 dark:text-gray-500" />
          Intent
        </span>
        <div className="w-[1px] h-3 bg-gray-300 dark:bg-gray-700 mx-1" />
        <AnimatePresence>
          {activeFilters.map(filter => (
            <motion.div
              layout
              key={filter.field}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0, width: 0 }}
              transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full hover:bg-gray-100/80 dark:hover:bg-gray-800/80 text-[11px] font-medium text-gray-700 dark:text-gray-300 transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-gray-700 cursor-default"
            >
              <span>{filter.label}</span>
              <button
                onClick={() => onRemove(filter.field)}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                title={`Remove ${filter.field}`}
              >
                <X size={10} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
