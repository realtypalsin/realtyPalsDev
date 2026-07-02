'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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
      className="w-full flex justify-center py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20"
    >
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl px-4">
        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mr-2">
          Searching for
        </span>
        <AnimatePresence>
          {activeFilters.map(filter => (
            <motion.div
              layout
              key={filter.field}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0, width: 0 }}
              transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50 rounded-full text-xs font-medium"
            >
              <span>{filter.label}</span>
              <button
                onClick={() => onRemove(filter.field)}
                className="w-4 h-4 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center transition-colors -mr-1"
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
