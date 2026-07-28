'use client'

interface HomeButtonsProps {
  onPrompt: (text: string) => void
  disabled?: boolean
}

const suggestedPrompts = [
  // Sector 75
  {
    label: '3 BHK in Sector 75 Noida',
    prompt: 'Show me 3 BHK apartments available for immediate purchase in Sector 75.'
  },
  {
    label: 'Premium Projects in Sector 75',
    prompt: 'Which builders are offering luxury housing options in Sector 75 Noida?'
  },
  {
    label: 'Flats near Metro in Sector 75',
    prompt: 'Find residential flats in Sector 75 that are within walking distance to the metro.'
  },
  // Sector 76
  {
    label: '2 BHK in Sector 76 Noida',
    prompt: 'Show me budget friendly 2 BHK flats available in Sector 76.'
  },
  {
    label: 'Sector 76 Resale Flats',
    prompt: 'Are there good resale property deals available in Sector 76 Noida?'
  },
  {
    label: '3 BHK in Sector 76 Noida',
    prompt: 'Find spacious 3 BHK apartments for families in Sector 76.'
  },
  // Sector 77
  {
    label: '3 BHK in Sector 77 Noida',
    prompt: 'Show me the most popular 3 BHK housing societies in Sector 77.'
  },
  {
    label: 'Ready Flats in Sector 77',
    prompt: 'Which completed projects in Sector 77 have ready to move apartments?'
  },
  {
    label: 'Sector 77 Price Trends',
    prompt: 'Are property prices in Sector 77 expected to increase this year?'
  },
  // Sector 78
  {
    label: '4 BHK in Sector 78 Noida',
    prompt: 'Find large 4 BHK flats and penthouses available in Sector 78.'
  },
  {
    label: 'Luxury Societies in Sector 78',
    prompt: 'What are the most premium gated communities located in Sector 78 Noida?'
  },
  {
    label: '3 BHK in Sector 78 Noida',
    prompt: 'Show me luxury 3 BHK properties available in Sector 78.'
  },
  // Sector 79
  {
    label: '3 BHK in Sector 79 Noida',
    prompt: 'Find 3 BHK flats near sports parks and green areas in Sector 79.'
  },
  {
    label: 'Sector 79 Sports City',
    prompt: 'What residential projects are part of the Sector 79 sports city?'
  },
  {
    label: '4 BHK in Sector 79 Noida',
    prompt: 'Show me spacious 4 BHK apartments with open views in Sector 79.'
  },
  // Sector 10 Noida Extension
  {
    label: '2 BHK in Sector 10 Noida Extension',
    prompt: 'Show me affordable 2 BHK apartments in Sector 10 Greater Noida West.'
  },
  {
    label: '3 BHK in Sector 10 Noida Extension',
    prompt: 'Find family sized 3 BHK flats under construction in Sector 10.'
  },
  {
    label: 'Sector 10 Commercial Shops',
    prompt: 'Are there retail shops available for purchase in Sector 10 Noida Extension?'
  },
  // Sector 12 Noida Extension
  {
    label: '3 BHK in Sector 12 Noida Extension',
    prompt: 'Show me newly launched 3 BHK luxury projects in Sector 12.'
  },
  {
    label: '4 BHK in Sector 12 Noida Extension',
    prompt: 'Find premium 4 BHK flats and luxury apartments in Sector 12 Greater Noida West.'
  },
  {
    label: 'Sector 12 Villa Projects',
    prompt: 'Are there independent villas available for purchase in Sector 12 Noida Extension?'
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
