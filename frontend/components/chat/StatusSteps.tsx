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

export default function StatusSteps({ phase, intent, resultCount }: Props) {
  if (!phase) return null;

  const activeIndex = STEPS.indexOf(phase);
  const content = PHASE_CONTENT[phase];
  const detail = content.detail?.(intent, resultCount);

  return (
    <div className="px-4 py-2 space-y-1.5">
      {/* Step rail */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <div key={step} className="flex items-center gap-1.5">
              <span
                className={[
                  'w-1.5 h-1.5 rounded-full transition-all',
                  done ? 'bg-green-400' : active ? 'bg-blue-400 animate-pulse' : 'bg-gray-200',
                ].join(' ')}
              />
              <span className={active ? 'text-blue-600 font-medium' : done ? 'text-green-600' : 'text-gray-300'}>
                {PHASE_CONTENT[step].label}
              </span>
              {i < STEPS.length - 1 && <span className="text-gray-200 mx-0.5">›</span>}
            </div>
          );
        })}
      </div>
      {/* Phase detail line */}
      {detail && (
        <p className="text-[11px] text-gray-400 font-mono pl-0.5 truncate">
          {detail}
        </p>
      )}
    </div>
  );
}
