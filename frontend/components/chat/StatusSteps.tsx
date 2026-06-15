'use client';

interface Props {
  phase: 'extracting' | 'searching' | 'generating' | null;
}

const STEPS = [
  { id: 'extracting', label: 'Extracting intent' },
  { id: 'searching', label: 'Searching properties' },
  { id: 'generating', label: 'Writing response' },
] as const;

export default function StatusSteps({ phase }: Props) {
  if (!phase) return null;

  const activeIndex = STEPS.findIndex((s) => s.id === phase);

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500">
      {STEPS.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={step.id} className="flex items-center gap-1.5">
            <span
              className={[
                'w-1.5 h-1.5 rounded-full transition-all',
                done ? 'bg-green-400' : active ? 'bg-blue-400 animate-pulse' : 'bg-gray-200',
              ].join(' ')}
            />
            <span className={active ? 'text-blue-600 font-medium' : done ? 'text-green-600' : 'text-gray-300'}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-gray-200 mx-0.5">›</span>}
          </div>
        );
      })}
    </div>
  );
}
