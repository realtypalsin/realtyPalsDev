'use client';

import React, { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  CaretDown,
  Clock,
  Circle
} from '@phosphor-icons/react';

export interface DomainExecutionTimelineProps {
  phase?: 'extracting' | 'searching' | 'generating' | 'completed' | null;
  intent?: Record<string, unknown> | null;
  resultCount?: number | null;
  spatialContext?: {
    anchorSector?: string;
    spatialScope?: string;
    nearbySectors?: string[];
  } | null;
  isStreaming?: boolean;
  queryType?: 'discovery' | 'analysis' | 'comparison' | 'locality' | 'builder';
  className?: string;
  defaultExpanded?: boolean;
}

export function DomainExecutionTimeline({
  phase = 'completed',
  intent,
  resultCount,
  spatialContext,
  isStreaming = false,
  queryType = 'discovery',
  className = '',
  defaultExpanded = false,
}: DomainExecutionTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Extract structured intent data
  const intentSummary = useMemo(() => {
    if (!intent) return null;
    const parts: string[] = [];
    if (Array.isArray(intent.bhk) && intent.bhk.length > 0) {
      parts.push(`${(intent.bhk as number[]).join('/')} BHK`);
    }
    if (intent.sector && typeof intent.sector === 'string') {
      parts.push(intent.sector);
    }
    if (typeof intent.budgetMax === 'number') {
      parts.push(`≤ ₹${intent.budgetMax}Cr`);
    } else if (typeof intent.budgetMin === 'number') {
      parts.push(`≥ ₹${intent.budgetMin}Cr`);
    }
    if (intent.possession === 'immediate' || intent.possession === 'ready') {
      parts.push('Ready to Move');
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [intent]);

  const targetSector = (typeof intent?.sector === 'string' ? intent.sector : spatialContext?.anchorSector) || 'Noida';
  const count = resultCount ?? 0;

  // Active status label (Claude style: "Thought for 12s" or live streaming status)
  const triggerLabel = useMemo(() => {
    if (!isStreaming && phase === 'completed') {
      if (count > 0) {
        return `Thought for 8s · Evaluated ${count} ${count === 1 ? 'project' : 'projects'}`;
      }
      return 'Thought for 6s';
    }

    if (phase === 'extracting') {
      return intentSummary ? `Thinking about criteria (${intentSummary})...` : 'Thinking about requirements...';
    }
    if (phase === 'searching') {
      return `Searching verified inventory in ${targetSector}...`;
    }
    if (phase === 'generating') {
      return count > 0 ? `Synthesizing recommendations from ${count} projects...` : 'Synthesizing response...';
    }
    return 'Thinking...';
  }, [isStreaming, phase, count, intentSummary, targetSector]);

  // Steps matching Claude's narrative thinking style
  const thinkingSteps = useMemo(() => {
    if (queryType === 'comparison') {
      return [
        'Retrieving verified project architectural plans, carpet areas, and super areas from database.',
        'Normalizing price per sq.ft and calculating total acquisition cost structure across projects.',
        'Auditing UP-RERA registration status, delivery track record, and completion timelines.',
        'Formulating objective side-by-side trade-off matrix highlighting layout efficiency and value.',
      ];
    }

    const steps = [
      intentSummary
        ? `Interpreting buyer requirements and filtering parameters: ${intentSummary}.`
        : `Targeting residential inventory matching criteria in ${targetSector}.`,
      count > 0
        ? `Scanned verified live database: identified ${count} qualifying projects in ${targetSector}.`
        : `Querying active verified database for residential developments in ${targetSector}.`,
      'Evaluating transit connectivity, arterial road access, and neighborhood infrastructure.',
      'Ranking qualified inventory by spatial efficiency, price benchmark, and delivery track record.',
    ];
    return steps;
  }, [queryType, intentSummary, targetSector, count]);

  return (
    <div className={`w-full select-none ${className}`}>
      {/* Claude-style Minimal Thought Trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 py-1 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer group select-none outline-none"
      >
        {isStreaming ? (
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-400" />
            </span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">{triggerLabel}</span>
          </span>
        ) : (
          <span>{triggerLabel}</span>
        )}

        <CaretDown
          size={12}
          weight="bold"
          className={`text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Claude-style Borderless Continuous Vertical Timeline */}
      <AnimatePresence>
        {isExpanded && (
          <m.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="relative pl-4 ml-1.5 my-2 border-l border-zinc-200 dark:border-zinc-800/80 space-y-3">
              {thinkingSteps.map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-2.5">
                  {/* Subtle Node on the line */}
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  </div>

                  <p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400 font-normal">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DomainExecutionTimeline;
