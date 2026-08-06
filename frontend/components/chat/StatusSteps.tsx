'use client';

interface Props {
  phase: 'extracting' | 'searching' | 'generating' | null;
  intent?: Record<string, unknown> | null;
  resultCount?: number | null;
}

function formatIntent(intent: Record<string, unknown> | null | undefined): string | null {
  if (!intent) return null;
  const parts: string[] = [];
  if (Array.isArray(intent.bhk) && intent.bhk.length > 0) {
    parts.push(`${(intent.bhk as number[]).join('/')} BHK`);
  }
  if (intent.sector && typeof intent.sector === 'string') {
    parts.push(intent.sector);
  }
  if (intent.budgetMax && typeof intent.budgetMax === 'number') {
    parts.push(`under ₹${intent.budgetMax}Cr`);
  } else if (intent.budgetMin && typeof intent.budgetMin === 'number') {
    parts.push(`from ₹${intent.budgetMin}Cr`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

const PHASE_CONTENT: Record<
  'extracting' | 'searching' | 'generating',
  { label: string; detail?: (intent: Record<string, unknown> | null | undefined, resultCount: number | null | undefined) => string | null }
> = {
  extracting: {
    label: 'Extracting intent',
    detail: () => 'Understanding your requirements...',
  },
  searching: {
    label: 'Searching properties',
    detail: (intent) => {
      const formatted = formatIntent(intent);
      return formatted ? `Looking for ${formatted}` : 'Scanning available projects...';
    },
  },
  generating: {
    label: 'Writing response',
    detail: (_, resultCount) => {
      if (resultCount == null) return 'Preparing recommendation...';
      if (resultCount === 0) return 'No exact matches · Suggesting alternatives...';
      return `Found ${resultCount} ${resultCount === 1 ? 'property' : 'properties'} · Writing recommendation...`;
    },
  },
};

const STEPS = ['extracting', 'searching', 'generating'] as const;

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export default function StatusSteps({ phase, intent, resultCount }: Props) {
  if (!phase) return null;

  const activeIndex = STEPS.indexOf(phase);

  return (
    <div className="p-4 space-y-4 font-sans bg-white dark:bg-transparent">
      {STEPS.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        const content = PHASE_CONTENT[step];
        const detail = content.detail?.(intent, resultCount);

        return (
          <div key={step} className="relative flex gap-3">
            {/* Vertical line connector */}
            {i < STEPS.length - 1 && (
              <div className="absolute left-2 top-6 bottom-[-16px] w-[1.5px] bg-gray-100 dark:bg-gray-800" />
            )}
            
            {/* Icon */}
            <div className="relative z-10 flex-shrink-0 mt-0.5 bg-white dark:bg-[#111]">
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              ) : active ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <Circle className="w-4 h-4 text-gray-200 dark:text-gray-800" />
              )}
            </div>
            
            {/* Content */}
            <div className="flex flex-col flex-1 min-w-0 -mt-0.5 pb-1">
              <span className={`text-[13px] font-semibold tracking-tight ${active ? 'text-gray-900 dark:text-gray-100' : done ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
                {content.label}
              </span>
              {detail && (active || done) && (
                <span className="text-[12px] text-gray-500 dark:text-gray-500 mt-0.5 leading-relaxed font-mono truncate">
                  {detail}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
