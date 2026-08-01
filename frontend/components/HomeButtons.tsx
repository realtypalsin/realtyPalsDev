'use client'

interface HomeButtonsProps {
  onPrompt: (text: string) => void
  disabled?: boolean
}

const suggestedPrompts = [
  {
    label: '3 BHK in Sector 75 Noida',
    prompt: 'Show me 3 BHK apartments available for immediate purchase in Sector 75.'
  },
  {
    label: '2 BHK in Sector 76 Noida',
    prompt: 'Show me budget friendly 2 BHK flats available in Sector 76.'
  },
  {
    label: '3 BHK in Sector 77 Noida',
    prompt: 'Show me the most popular 3 BHK housing societies in Sector 77.'
  },
  {
    label: '4 BHK in Sector 78 Noida',
    prompt: 'Find large 4 BHK flats and luxury apartments available in Sector 78.'
  },
  {
    label: '3 BHK in Sector 79 Noida',
    prompt: 'Find 3 BHK flats near sports parks and green areas in Sector 79.'
  },
  {
    label: '2 BHK in Sector 10 Noida Extension',
    prompt: 'Show me affordable 2 BHK apartments in Sector 10 Greater Noida West.'
  }
]

export function HomeButtons({ onPrompt, disabled = false }: HomeButtonsProps) {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {suggestedPrompts.map((item, idx) => (
        <button
          key={idx}
          onClick={() => onPrompt(item.prompt)}
          disabled={disabled}
          className="group relative flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left
            bg-white dark:bg-[#1a1a1a]
            border border-zinc-200 dark:border-zinc-800
            hover:bg-zinc-50 dark:hover:bg-[#222]
            hover:border-blue-300 dark:hover:border-blue-600
            active:scale-[0.98]
            transition-all duration-150
            disabled:opacity-50 disabled:pointer-events-none
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          title={item.label}
        >
          <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">{item.label}</span>
          <span className="flex-shrink-0 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors">→</span>
        </button>
      ))}
    </div>
  )
}
