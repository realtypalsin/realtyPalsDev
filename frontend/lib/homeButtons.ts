export interface HomeButtonSubItem {
  label: string;
  prompt: string;
}

export interface HomeButtonGroup {
  id: string;
  title: string;
  primaryPrompt: string;
  icon: string;
  colorClass: string;
  options: HomeButtonSubItem[];
}

export const HOME_BUTTON_GROUPS: HomeButtonGroup[] = [
  {
    id: 'sec75',
    title: '3 BHK in Sector 75 Noida',
    primaryPrompt: 'Show me 3 BHK apartments available for immediate purchase in Sector 75.',
    icon: 'Building2',
    colorClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400',
    options: [
      {
        label: 'Immediate purchase 3 BHK',
        prompt: 'Show me 3 BHK apartments available for immediate purchase in Sector 75.'
      },
      {
        label: 'Luxury housing options',
        prompt: 'Which builders are offering luxury housing options in Sector 75 Noida?'
      },
      {
        label: 'Flats near Metro station',
        prompt: 'Find residential flats in Sector 75 that are within walking distance to the metro.'
      }
    ]
  },
  {
    id: 'sec76',
    title: '2 BHK in Sector 76 Noida',
    primaryPrompt: 'Show me budget friendly 2 BHK flats available in Sector 76.',
    icon: 'Home',
    colorClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
    options: [
      {
        label: 'Budget friendly 2 BHK',
        prompt: 'Show me budget friendly 2 BHK flats available in Sector 76.'
      },
      {
        label: 'Resale property deals',
        prompt: 'Are there good resale property deals available in Sector 76 Noida?'
      },
      {
        label: 'Spacious family 3 BHK',
        prompt: 'Find spacious 3 BHK apartments for families in Sector 76.'
      }
    ]
  },
  {
    id: 'sec77',
    title: '3 BHK in Sector 77 Noida',
    primaryPrompt: 'Show me the most popular 3 BHK housing societies in Sector 77.',
    icon: 'Key',
    colorClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
    options: [
      {
        label: 'Popular housing societies',
        prompt: 'Show me the most popular 3 BHK housing societies in Sector 77.'
      },
      {
        label: 'Ready to move flats',
        prompt: 'Which completed projects in Sector 77 have ready to move apartments?'
      },
      {
        label: 'Price growth & trends',
        prompt: 'Are property prices in Sector 77 expected to increase this year?'
      }
    ]
  },
  {
    id: 'sec78_4bhk',
    title: '4 BHK in Sector 78 Noida',
    primaryPrompt: 'Find large 4 BHK flats and penthouses available in Sector 78.',
    icon: 'Crown',
    colorClass: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400',
    options: [
      {
        label: 'Large 4 BHK & Penthouses',
        prompt: 'Find large 4 BHK flats and penthouses available in Sector 78.'
      },
      {
        label: 'Premium gated communities',
        prompt: 'What are the most premium gated communities located in Sector 78 Noida?'
      },
      {
        label: 'Luxury 3 BHK options',
        prompt: 'Show me luxury 3 BHK properties available in Sector 78.'
      }
    ]
  },
  {
    id: 'sec79',
    title: '3 BHK in Sector 79 Noida',
    primaryPrompt: 'Find 3 BHK flats near sports parks and green areas in Sector 79.',
    icon: 'Trees',
    colorClass: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-400',
    options: [
      {
        label: 'Flats near sports & parks',
        prompt: 'Find 3 BHK flats near sports parks and green areas in Sector 79.'
      },
      {
        label: 'Sports City projects',
        prompt: 'What residential projects are part of the Sector 79 sports city?'
      },
      {
        label: 'Spacious 4 BHK with open view',
        prompt: 'Show me spacious 4 BHK apartments with open views in Sector 79.'
      }
    ]
  },
  {
    id: 'sec10',
    title: '2 BHK in Sector 10 Noida Extension',
    primaryPrompt: 'Show me affordable 2 BHK apartments in Sector 10 Greater Noida West.',
    icon: 'Wallet',
    colorClass: 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-400',
    options: [
      {
        label: 'Affordable 2 BHK flats',
        prompt: 'Show me affordable 2 BHK apartments in Sector 10 Greater Noida West.'
      },
      {
        label: 'Under construction 3 BHK',
        prompt: 'Find family sized 3 BHK flats under construction in Sector 10.'
      },
      {
        label: 'Retail & commercial shops',
        prompt: 'Are there retail shops available for purchase in Sector 10 Noida Extension?'
      }
    ]
  },
  {
    id: 'sec12',
    title: '3 BHK in Sector 12 Noida Extension',
    primaryPrompt: 'Show me newly launched 3 BHK luxury projects in Sector 12.',
    icon: 'Sparkles',
    colorClass: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400',
    options: [
      {
        label: 'Newly launched 3 BHK luxury',
        prompt: 'Show me newly launched 3 BHK luxury projects in Sector 12.'
      },
      {
        label: 'Premium 4 BHK apartments',
        prompt: 'Find premium 4 BHK flats and luxury apartments in Sector 12 Greater Noida West.'
      },
      {
        label: 'Independent villa projects',
        prompt: 'Are there independent villas available for purchase in Sector 12 Noida Extension?'
      }
    ]
  },
  {
    id: 'sec78_luxury',
    title: 'Luxury Societies in Sector 78',
    primaryPrompt: 'What are the most premium gated communities located in Sector 78 Noida?',
    icon: 'Shield',
    colorClass: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400',
    options: [
      {
        label: 'Top premium gated societies',
        prompt: 'What are the most premium gated communities located in Sector 78 Noida?'
      },
      {
        label: 'Luxury 3 BHK & 4 BHK units',
        prompt: 'Show me luxury 3 BHK and 4 BHK properties available in Sector 78.'
      },
      {
        label: 'Penthouses & high-end amenities',
        prompt: 'Find penthouses with top amenities in Sector 78 Noida.'
      }
    ]
  }
];
